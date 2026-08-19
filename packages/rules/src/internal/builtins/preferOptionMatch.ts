import { Array, Function, HashSet, Option, Schema, Tuple, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { strictEqual } from "../equivalence.js"

import { OptionGuardKind } from "./optionGuardKind.js"

// PreferOptionMatchFact exists because its fields form one stable data contract used by the linter.
export const PreferOptionMatchFact = Schema.Struct({
  kind: OptionGuardKind,
  argumentName: Schema.String
})

export interface PreferOptionMatchFact extends Schema.Schema.Type<typeof PreferOptionMatchFact> {}

const guardMethodNames = HashSet.make("isSome", "isNone")

const isOptionText = strictEqual("Option")

const isGuardMethodName = (name: string) => HashSet.has(guardMethodNames, name)

const containsDotValue =
  (name: string) =>
  (node: ts.Node): boolean => {
    const childResult = ts.forEachChild(node, containsDotValue(name))
    const childHasDotValue = strictEqual(true)(childResult)
    const isPropertyAccess = ts.isPropertyAccessExpression(node)

    if (!isPropertyAccess) {
      return childHasDotValue
    }

    const hasValueName = strictEqual("value")(node.name.text)
    const expressionIsIdentifier = ts.isIdentifier(node.expression)

    if (!expressionIsIdentifier) {
      return childHasDotValue
    }

    const expressionTextMatches = strictEqual(name)(node.expression.text)
    const isDotValue = hasValueName && expressionTextMatches

    return isDotValue || childHasDotValue
  }

const conditionalExpressionKinds = Array.of(ts.SyntaxKind.ConditionalExpression)

const matchOptionGuardConditional = (conditional: ts.ConditionalExpression) =>
  pipe(
    Option.gen(function* () {
      const unwrapped = unwrapTransparentExpression(conditional.condition)
      const call = yield* Option.liftPredicate(ts.isCallExpression)(unwrapped)
      const callee = yield* Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression)
      const object = yield* Option.liftPredicate(ts.isIdentifier)(callee.expression)

      yield* Option.liftPredicate(isOptionText)(object.text)
      yield* Option.liftPredicate(isGuardMethodName)(callee.name.text)
      const firstArg = yield* Option.fromNullishOr(call.arguments[0])
      const identifier = yield* Option.liftPredicate(ts.isIdentifier)(firstArg)

      return Tuple.make(callee.name.text as OptionGuardKind, identifier.text)
    }),
    Option.filter(([kind, argumentName]: readonly [OptionGuardKind, string]): boolean => {
      const isSomeGuard = strictEqual("isSome")(kind)
      const branch = isSomeGuard ? conditional.whenTrue : conditional.whenFalse

      return containsDotValue(argumentName)(branch)
    }),
    Option.map(([kind, argumentName]: readonly [OptionGuardKind, string]) => {
      const fact = PreferOptionMatchFact.make({
        kind,
        argumentName
      })

      return makeNodeMatch(conditional, fact)
    }),
    Option.toArray
  )

const optionMatchMatches = Function.constant(matchOptionGuardConditional)

export const preferOptionMatchScanner = makeNodeScanner(conditionalExpressionKinds)(
  ts.isConditionalExpression
)(optionMatchMatches)
