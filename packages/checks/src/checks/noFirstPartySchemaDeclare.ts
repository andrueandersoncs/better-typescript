import { Array, Function, HashSet, pipe, Option, Struct } from "effect"
import * as ts from "typescript"
import { isFirstPartySymbol } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
const accessExpression = Struct.get<ts.PropertyAccessExpression, "expression">("expression")

const declarePropertyAccess = (call: ts.CallExpression) =>
  Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression)

const hasDeclareText = (access: ts.PropertyAccessExpression) => access.name.text === "declare"

const isDeclareCall = (node: ts.Node): node is ts.CallExpression =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.flatMap(declarePropertyAccess),
    Option.exists(hasDeclareText)
  )

const typePredicateAssertedType = (predicate: ts.TypePredicate) =>
  Option.fromNullishOr(predicate.type)

const typeSymbol = (type: ts.Type) =>
  pipe(
    Option.fromNullishOr(type.aliasSymbol),
    Option.orElse(() => pipe(type, (candidate) => candidate.getSymbol(), Option.fromNullishOr))
  )

const opaquePrimitiveKinds = HashSet.make(
  ts.SyntaxKind.StringKeyword,
  ts.SyntaxKind.NumberKeyword,
  ts.SyntaxKind.BooleanKeyword,
  ts.SyntaxKind.BigIntKeyword,
  ts.SyntaxKind.SymbolKeyword
)

const isOpaqueAliasDeclaration = (declaration: ts.Declaration) =>
  pipe(
    Option.liftPredicate(ts.isTypeAliasDeclaration)(declaration),
    Option.map(Struct.get("type")),
    Option.filter(ts.isIntersectionTypeNode),
    Option.exists((intersection) => {
      const hasPrimitiveBase = Array.some(intersection.types, (type) =>
        HashSet.has(opaquePrimitiveKinds, type.kind)
      )

      const hasOpaqueMarker = intersection.types.length > 1

      return hasPrimitiveBase && hasOpaqueMarker
    })
  )

const isStructuralOwnedDeclaration = (declaration: ts.Declaration) => {
  const isInterface = ts.isInterfaceDeclaration(declaration)
  const isClass = ts.isClassDeclaration(declaration)
  const isNominalDeclaration = isInterface || isClass
  const isAlias = ts.isTypeAliasDeclaration(declaration)
  const isOpaqueAlias = isOpaqueAliasDeclaration(declaration)
  const isStructural = isOpaqueAlias === false
  const isStructuralAlias = isAlias && isStructural

  return isNominalDeclaration || isStructuralAlias
}

const symbolDeclarations = (symbol: ts.Symbol): ReadonlyArray<ts.Declaration> =>
  symbol.getDeclarations() ?? Array.empty()

const isStructuralOwnedSymbol = (symbol: ts.Symbol) =>
  pipe(symbol, symbolDeclarations, Array.some(isStructuralOwnedDeclaration))

const isFirstPartyStructuralModel = (type: ts.Type) => {
  const symbol = typeSymbol(type)
  const isFirstParty = Option.exists(symbol, isFirstPartySymbol)
  const isStructural = Option.exists(symbol, isStructuralOwnedSymbol)
  const isDataStructure = type.getCallSignatures().length === 0
  // Exempt generic parameters because callers supply the type, not a first-party structural model.
  const isConcreteType = !type.isTypeParameter()
  const ambientConditions = Array.make(isFirstParty, isStructural, isDataStructure, isConcreteType)

  return Array.every(ambientConditions, Boolean)
}

const symbolName = Struct.get<ts.Symbol, "name">("name")

const fallbackTypeName: () => string = Function.constant("unknown")

const schemaDeclareHint =
  "Schema.declare is for third-party integrations and non-parametric opaque or branded types " +
  "validated by a type guard. For structural models you own, define a Schema.Struct plus a " +
  "same-named decoded interface — for example export const MyType = Schema.Struct({ ... }); " +
  "export interface MyType extends Schema.Schema.Type<typeof MyType> {} — which gives you " +
  "validation, encoding, and decoding for free."

const schemaDeclareMatches = (context: CheckContext) => {
  const { checker } = context
  const match = makeDetection(context)

  const assertedType = (predicate: ts.Expression) => {
    const type = checker.getTypeAtLocation(predicate)
    const signatures = type.getCallSignatures()

    return pipe(
      Option.fromNullishOr(signatures[0]),
      Option.flatMap((signature) =>
        pipe(
          signature,
          (candidate) => checker.getTypePredicateOfSignature(candidate),
          Option.fromNullishOr
        )
      ),
      Option.flatMap(typePredicateAssertedType)
    )
  }

  const matches = (call: ts.CallExpression): ReadonlyArray<Detection> => {
    const access = call.expression as ts.PropertyAccessExpression
    const object = accessExpression(access)
    if (!ts.isIdentifier(object)) return Array.empty()
    const isOnSchema = object.text === "Schema"
    const isDeclareOnSchema = isOnSchema && call.arguments.length > 0

    const declareMatch = isDeclareOnSchema
      ? pipe(
          Option.fromNullishOr(call.arguments[0]),
          Option.flatMap(assertedType),
          Option.filter(isFirstPartyStructuralModel),
          Option.map((type) => {
            const name = pipe(
              typeSymbol(type),
              Option.map(symbolName),
              Option.getOrElse(fallbackTypeName)
            )

            const message = `Avoid Schema.declare for the first-party structural type "${name}".`

            return match({ node: call, message, hint: schemaDeclareHint })
          })
        )
      : Option.none()

    return Option.toArray(declareMatch)
  }

  return matches
}

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

export const noFirstPartySchemaDeclare = makeCheck(
  "no-first-party-schema-declare",
  callExpressionKinds,
  isDeclareCall,
  schemaDeclareMatches
)
