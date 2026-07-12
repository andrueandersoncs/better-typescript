import { Array } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { unwrapExpression } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
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
    if (!ts.isArrayLiteralExpression(spread.parent)) return []

    const expression = unwrapExpression(spread.expression)
    if (!ts.isConditionalExpression(expression)) return []

    const emptyThenNonEmptyConditions = [
      isEmptyArrayLiteral(expression.whenTrue),
      isNonEmptyArrayBranch(expression.whenFalse)
    ]
    const emptyThenNonEmpty = Array.every(emptyThenNonEmptyConditions, Boolean)
    const nonEmptyThenEmptyConditions = [
      isNonEmptyArrayBranch(expression.whenTrue),
      isEmptyArrayLiteral(expression.whenFalse)
    ]
    const nonEmptyThenEmpty = Array.every(nonEmptyThenEmptyConditions, Boolean)

    return Array.some([emptyThenNonEmpty, nonEmptyThenEmpty], Boolean)
      ? [match({ node: spread, message, hint })]
      : []
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.SpreadElement])(ts.isSpreadElement)(
  conditionalArraySpreadMatches
)

export const preferEffectArrayAppendAll: Check = check

export const preferEffectArrayAppendAllExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-array-append-all")
