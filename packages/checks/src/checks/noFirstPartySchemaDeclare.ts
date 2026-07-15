import { Array, Function, pipe, Option, Struct } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { isFirstPartySymbol } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const accessExpression = Struct.get("expression")

const declarePropertyAccess = (
  call: ts.CallExpression
): Option.Option<ts.PropertyAccessExpression> =>
  Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression)

const hasDeclareText = (access: ts.PropertyAccessExpression): boolean =>
  access.name.text === "declare"

const isDeclareCall = (node: ts.Node): node is ts.CallExpression =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.flatMap(declarePropertyAccess),
    Option.exists(hasDeclareText)
  )

const typePredicateAssertedType = (predicate: ts.TypePredicate): Option.Option<ts.Type> =>
  Option.fromNullable(predicate.type)

const typeSymbol = (type: ts.Type): Option.Option<ts.Symbol> =>
  pipe(
    Option.fromNullable(type.aliasSymbol),
    Option.orElse(() =>
      pipe(type, (candidate: ts.Type) => candidate.getSymbol(), Option.fromNullable)
    )
  )

const isFirstPartyDataStructure = (type: ts.Type): boolean => {
  const symbol = typeSymbol(type)
  const isFirstParty = Option.exists(symbol, isFirstPartySymbol)
  const isDataStructure = type.getCallSignatures().length === 0
  // Exempt generic parameters because callers supply their type rather than the project defining a first-party data structure.
  const isConcreteType = !type.isTypeParameter()

  const ambientConditions = Array.make(isFirstParty, isDataStructure, isConcreteType)

  return Array.every(ambientConditions, Boolean)
}

const symbolName = Struct.get("name")

const fallbackTypeName: () => string = Function.constant("unknown")

const schemaDeclareHint =
  "Schema.declare is meant for integrating third-party types you do not control. " +
  "For types you own, define a proper Schema — for example class MyType extends " +
  'Schema.Class<MyType>("MyType")({ ... }) {} — which gives you validation, ' +
  "encoding, and decoding for free."

const schemaDeclareMatches = (context: CheckContext) => {
  const { checker } = context
  const match = detection(context)

  const assertedType = (predicate: ts.Expression): Option.Option<ts.Type> => {
    const type = checker.getTypeAtLocation(predicate)
    const signatures = type.getCallSignatures()

    return pipe(
      Option.fromNullable(signatures[0]),
      Option.flatMap((signature) =>
        pipe(
          signature,
          (candidate) => checker.getTypePredicateOfSignature(candidate),
          Option.fromNullable
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
          Option.fromNullable(call.arguments[0]),
          Option.flatMap(assertedType),
          Option.filter(isFirstPartyDataStructure),
          Option.map((type) => {
            const name = pipe(
              typeSymbol(type),
              Option.map(symbolName),
              Option.getOrElse(fallbackTypeName)
            )

            const message = `Avoid Schema.declare for the first-party type "${name}".`

            return match({ node: call, message, hint: schemaDeclareHint })
          })
        )
      : Option.none()

    return Option.toArray(declareMatch)
  }

  return matches
}

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

const check = nodeCheck(callExpressionKinds)(isDeclareCall)(schemaDeclareMatches)

export const noFirstPartySchemaDeclare: Check = check

export const noFirstPartySchemaDeclareExamples: NonEmptyRefactorExamples = fixtureRefactorExamples(
  "no-first-party-schema-declare"
)
