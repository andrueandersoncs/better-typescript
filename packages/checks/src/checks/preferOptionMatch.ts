import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { unwrapTransparentExpression } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
type OptionGuardKind = "isSome" | "isNone"

const guardMethodNames = HashSet.make("isSome", "isNone")

const isOptionText = (text: string): boolean => text === "Option"

const isGuardMethodName = (name: string): boolean =>
  HashSet.has(guardMethodNames, name)

const containsDotValue =
  (name: string) =>
  (node: ts.Node): boolean => {
    const childHasDotValue =
      ts.forEachChild(node, containsDotValue(name)) === true
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

  const matches = (
    conditional: ts.ConditionalExpression
  ): ReadonlyArray<Detection> =>
    pipe(
      Option.gen(function* () {
        const unwrapped = unwrapTransparentExpression(conditional.condition)
        const call = yield* Option.liftPredicate(ts.isCallExpression)(unwrapped)
        const callee = yield* Option.liftPredicate(
          ts.isPropertyAccessExpression
        )(call.expression)
        const object = yield* Option.liftPredicate(ts.isIdentifier)(
          callee.expression
        )
        yield* Option.liftPredicate(isOptionText)(object.text)
        const methodName = callee.name.text
        yield* Option.liftPredicate(isGuardMethodName)(methodName)
        const firstArg = yield* Option.fromNullable(call.arguments[0])
        const identifier = yield* Option.liftPredicate(ts.isIdentifier)(
          firstArg
        )

        return [methodName as OptionGuardKind, identifier.text] as const
      }),
      Option.filter(
        ([kind, argumentName]: readonly [OptionGuardKind, string]): boolean => {
          const isSomeGuard = kind === "isSome"
          const branch = isSomeGuard
            ? conditional.whenTrue
            : conditional.whenFalse

          return containsDotValue(argumentName)(branch)
        }
      ),
      Option.map((_guard: readonly [OptionGuardKind, string]): Detection =>
        match({
          node: conditional,
          message:
            "Avoid using Option.isSome/isNone in a ternary to unwrap an Option.",
          hint:
            "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) " +
            "instead of manually checking and accessing .value."
        })
      ),
      Option.toArray
    )

  return matches
}

const check = nodeCheck([ts.SyntaxKind.ConditionalExpression])(
  ts.isConditionalExpression
)(optionMatchMatches)

export const preferOptionMatch: Check = check

export const preferOptionMatchExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-option-match")
