import { Array } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { unwrapExpression } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const message = "Avoid conditional array spreads."

const hint =
  "Use Array.appendAll from Effect to combine arrays instead of spreading a conditional " +
  "expression that chooses between an array and an empty array literal."

const arrayLiteralElementCount = (expression: ts.Expression): number => {
  const unwrapped = unwrapExpression(expression)

  return ts.isArrayLiteralExpression(unwrapped) ? unwrapped.elements.length : -1
}

const isEmptyArrayLiteral = (expression: ts.Expression): boolean =>
  arrayLiteralElementCount(expression) === 0

const isNonEmptyArrayBranch = (expression: ts.Expression): boolean =>
  arrayLiteralElementCount(expression) !== 0

const conditionalArraySpreadMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (spread: ts.SpreadElement): ReadonlyArray<Detection> => {
    if (!ts.isArrayLiteralExpression(spread.parent)) return Array.empty()

    const expression = unwrapExpression(spread.expression)
    if (!ts.isConditionalExpression(expression)) return Array.empty()

    const emptyWhenTrue = isEmptyArrayLiteral(expression.whenTrue)
    const nonEmptyWhenFalse = isNonEmptyArrayBranch(expression.whenFalse)

    const emptyThenNonEmptyConditions = Array.make(emptyWhenTrue, nonEmptyWhenFalse)

    const emptyThenNonEmpty = Array.every(emptyThenNonEmptyConditions, Boolean)

    const nonEmptyWhenTrue = isNonEmptyArrayBranch(expression.whenTrue)
    const emptyWhenFalse = isEmptyArrayLiteral(expression.whenFalse)

    const nonEmptyThenEmptyConditions = Array.make(nonEmptyWhenTrue, emptyWhenFalse)

    const nonEmptyThenEmpty = Array.every(nonEmptyThenEmptyConditions, Boolean)

    const checks = Array.make(emptyThenNonEmpty, nonEmptyThenEmpty)
    const detection = match({ node: spread, message, hint })
    return Array.some(checks, Boolean) ? Array.of(detection) : Array.empty()
  }

  return matches
}

const kinds = Array.of(ts.SyntaxKind.SpreadElement)

const check = nodeCheck(kinds)(ts.isSpreadElement)(conditionalArraySpreadMatches)

export const preferEffectArrayAppendAll: Check = check

export const preferEffectArrayAppendAllExamples: NonEmptyRefactorExamples = fixtureRefactorExamples(
  "prefer-effect-array-append-all"
)
