import { Tuple, Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
// OptionGuardKind is Option guard syntax vocabulary because Some and None share one matcher.
export type OptionGuardKind = "isSome" | "isNone"

const guardMethodNames = HashSet.make("isSome", "isNone")

const isOptionText = (text: string): boolean => text === "Option"

const isGuardMethodName = (name: string) => HashSet.has(guardMethodNames, name)

const containsDotValue =
  (name: string) =>
  (node: ts.Node): boolean => {
    const childHasDotValue = ts.forEachChild(node, containsDotValue(name)) === true
    const isPropertyAccess = ts.isPropertyAccessExpression(node)

    if (!isPropertyAccess) {
      return childHasDotValue
    }

    const hasValueName = node.name.text === "value"
    const expressionIsIdentifier = ts.isIdentifier(node.expression)

    if (!expressionIsIdentifier) {
      return childHasDotValue
    }

    const expressionTextMatches = node.expression.text === name
    const isDotValue = hasValueName && expressionTextMatches

    return isDotValue || childHasDotValue
  }

const optionMatchMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (conditional: ts.ConditionalExpression): ReadonlyArray<Detection> =>
    pipe(
      Option.gen(function* () {
        const unwrapped = unwrapTransparentExpression(conditional.condition)
        const call = yield* Option.liftPredicate(ts.isCallExpression)(unwrapped)
        const callee = yield* Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression)
        const object = yield* Option.liftPredicate(ts.isIdentifier)(callee.expression)

        yield* Option.liftPredicate(isOptionText)(object.text)
        const methodName = callee.name.text
        yield* Option.liftPredicate(isGuardMethodName)(methodName)
        const firstArg = yield* Option.fromNullishOr(call.arguments[0])
        const identifier = yield* Option.liftPredicate(ts.isIdentifier)(firstArg)

        return Tuple.make(methodName as OptionGuardKind, identifier.text)
      }),
      Option.filter(([kind, argumentName]: readonly [OptionGuardKind, string]): boolean => {
        const isSomeGuard = kind === "isSome"
        const branch = isSomeGuard ? conditional.whenTrue : conditional.whenFalse

        return containsDotValue(argumentName)(branch)
      }),
      Option.map((_guard: readonly [OptionGuardKind, string]): Detection =>
        match({
          node: conditional,
          message: "Avoid using Option.isSome/isNone in a ternary to unwrap an Option.",
          hint:
            "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) " +
            "instead of manually checking and accessing .value."
        })
      ),
      Option.toArray
    )

  return matches
}

const conditionalExpressionKinds = Array.of(ts.SyntaxKind.ConditionalExpression)

export const preferOptionMatch = makeCheck(
  "prefer-option-match",
  conditionalExpressionKinds,
  ts.isConditionalExpression,
  optionMatchMatches
)
