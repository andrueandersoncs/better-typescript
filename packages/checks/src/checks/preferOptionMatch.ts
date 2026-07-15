import { Tuple, Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"
/**
 * OptionGuardKind is the compiler syntax vocabulary handled by Option guard
 * matching.
 *
 * @remarks
 *   It remains explicit because Some and None guards share one matcher contract;
 *   removing it would repeat the literal union and let accepted cases drift.
 * @modelRole protocol
 */
export type OptionGuardKind = "isSome" | "isNone"

const guardMethodNames = HashSet.make("isSome", "isNone")

const isOptionText = (text: string): boolean => text === "Option"

const isGuardMethodName = (name: string): boolean => HashSet.has(guardMethodNames, name)

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
  const match = detection(context)

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
        const firstArg = yield* Option.fromNullable(call.arguments[0])

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

const check = nodeCheck(conditionalExpressionKinds)(ts.isConditionalExpression)(optionMatchMatches)

export const preferOptionMatch: Check = check

export const preferOptionMatchExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-option-match")
