import { Array, Function, HashSet, Option, pipe, Struct, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"
import { isFirstPartySymbol, symbolDeclarations } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

// NoFirstPartySchemaDeclareFact names the ambient model because guidance cites the declared type.
export const NoFirstPartySchemaDeclareFact = Schema.Struct({
  typeName: Schema.String
})

export interface NoFirstPartySchemaDeclareFact extends Schema.Schema.Type<
  typeof NoFirstPartySchemaDeclareFact
> {}

const accessExpression = Struct.get<ts.PropertyAccessExpression, "expression">("expression")

const declarePropertyAccess = (call: ts.CallExpression) =>
  Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression)

const hasDeclareText = (access: ts.PropertyAccessExpression) =>
  strictEqual("declare")(access.name.text)

const isDeclareCall = (node: ts.Node): node is ts.CallExpression =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.flatMap(declarePropertyAccess),
    Option.exists(hasDeclareText)
  )

const typePredicateAssertedType = (predicate: ts.TypePredicate) =>
  Option.fromNullishOr(predicate.type)

const typeSymbol = (type: ts.Type) => {
  const symbolFromType = (candidate: ts.Type) => pipe(candidate.getSymbol(), Option.fromNullishOr)

  return pipe(
    Option.fromNullishOr(type.aliasSymbol),
    Option.orElse(() => symbolFromType(type))
  )
}

const opaquePrimitiveKinds = HashSet.make(
  ts.SyntaxKind.StringKeyword,
  ts.SyntaxKind.NumberKeyword,
  ts.SyntaxKind.BooleanKeyword,
  ts.SyntaxKind.BigIntKeyword,
  ts.SyntaxKind.SymbolKeyword
)

const isOpaquePrimitiveType = (type: ts.TypeNode) => HashSet.has(opaquePrimitiveKinds, type.kind)

const intersectionIsOpaqueAlias = (intersection: ts.IntersectionTypeNode) => {
  const hasPrimitiveBase = Array.some(intersection.types, isOpaquePrimitiveType)
  const hasOpaqueMarker = intersection.types.length > 1

  return hasPrimitiveBase && hasOpaqueMarker
}

const isOpaqueAliasDeclaration = (declaration: ts.Declaration) =>
  pipe(
    Option.liftPredicate(ts.isTypeAliasDeclaration)(declaration),
    Option.map(Struct.get("type")),
    Option.filter(ts.isIntersectionTypeNode),
    Option.exists(intersectionIsOpaqueAlias)
  )

const isStructuralOwnedDeclaration = (declaration: ts.Declaration) => {
  const isInterface = ts.isInterfaceDeclaration(declaration)
  const isClass = ts.isClassDeclaration(declaration)
  const isNominalDeclaration = isInterface || isClass
  const isAlias = ts.isTypeAliasDeclaration(declaration)
  const isOpaqueAlias = isOpaqueAliasDeclaration(declaration)
  const isStructural = strictEqual(false)(isOpaqueAlias)
  const isStructuralAlias = isAlias && isStructural

  return isNominalDeclaration || isStructuralAlias
}

const isStructuralOwnedSymbol = (symbol: ts.Symbol) => {
  const declarations = symbolDeclarations(symbol) ?? Array.empty()

  return Array.some(declarations, isStructuralOwnedDeclaration)
}

const isFirstPartyStructuralModel = (type: ts.Type) => {
  const symbol = typeSymbol(type)
  const isFirstParty = Option.exists(symbol, isFirstPartySymbol)
  const isStructural = Option.exists(symbol, isStructuralOwnedSymbol)
  const callSignatureCount = type.getCallSignatures().length
  const isDataStructure = strictEqual(0)(callSignatureCount)
  // Exempt generic parameters because callers supply the type, not a first-party structural model.
  const isConcreteType = !type.isTypeParameter()
  const ambientConditions = Array.make(isFirstParty, isStructural, isDataStructure, isConcreteType)

  return Array.every(ambientConditions, Boolean)
}

const symbolName = Struct.get<ts.Symbol, "name">("name")

const fallbackTypeName: () => string = Function.constant("unknown")

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

const firstPartySchemaDeclareMatches = (context: MatchContext) => {
  const { checker } = context

  const assertedType = (predicate: ts.Expression) => {
    const type = checker.getTypeAtLocation(predicate)
    const signatures = type.getCallSignatures()

    const typePredicateOptionFromSignature = (signature: ts.Signature) =>
      pipe(checker.getTypePredicateOfSignature(signature), Option.fromNullishOr)

    const firstSignature = Array.head(signatures)

    return pipe(
      firstSignature,
      Option.flatMap(typePredicateOptionFromSignature),
      Option.flatMap(typePredicateAssertedType)
    )
  }

  const matchDeclareCall = (call: ts.CallExpression) => {
    const access = call.expression as ts.PropertyAccessExpression
    const object = accessExpression(access)
    if (!ts.isIdentifier(object)) return Array.empty()
    const isOnSchema = strictEqual("Schema")(object.text)
    const isDeclareOnSchema = isOnSchema && call.arguments.length > 0
    const firstArgument = Array.head(call.arguments)

    const factForType = (type: ts.Type) => {
      const name = pipe(
        typeSymbol(type),
        Option.map(symbolName),
        Option.getOrElse(fallbackTypeName)
      )

      const fact = NoFirstPartySchemaDeclareFact.make({
        typeName: name
      })

      return makeNodeMatch(call, fact)
    }

    const declareMatch = isDeclareOnSchema
      ? pipe(
          firstArgument,
          Option.flatMap(assertedType),
          Option.filter(isFirstPartyStructuralModel),
          Option.map(factForType)
        )
      : Option.none()

    return Option.toArray(declareMatch)
  }

  return matchDeclareCall
}

export const noFirstPartySchemaDeclareMatcher = nodeMatcher(callExpressionKinds)(isDeclareCall)(
  firstPartySchemaDeclareMatches
)
