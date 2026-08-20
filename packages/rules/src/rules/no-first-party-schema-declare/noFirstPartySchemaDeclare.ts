import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, HashSet, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { isFirstPartySymbol } from "../../internal/support/isFirstPartySymbol.js"
import { symbolDeclarations } from "../../internal/support/symbolDeclarations.js"
import { strictEqual } from "../../internal/equivalence.js"
import { typeSymbol } from "../../internal/builtins/typeSymbol.js"

// NoFirstPartySchemaDeclareFact exists because its fields form one stable data contract used by the linter.
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

const firstPartySchemaDeclareMatches = (context: MatchContext) => {
  const assertedType = (predicate: ts.Expression) => {
    const type = context.checker.getTypeAtLocation(predicate)
    const signatures = type.getCallSignatures()

    const typePredicateOptionFromSignature = (signature: ts.Signature) =>
      pipe(context.checker.getTypePredicateOfSignature(signature), Option.fromNullishOr)

    const firstSignature = Array.head(signatures)

    return pipe(
      firstSignature,
      Option.flatMap(typePredicateOptionFromSignature),
      Option.flatMap(typePredicateAssertedType)
    )
  }

  const matchDeclareCall = (call: ts.CallExpression) => {
    const object = accessExpression(call.expression as ts.PropertyAccessExpression)
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

export const noFirstPartySchemaDeclareScanner = makeNodeScanner(callExpressionKinds)(isDeclareCall)(
  firstPartySchemaDeclareMatches
)
