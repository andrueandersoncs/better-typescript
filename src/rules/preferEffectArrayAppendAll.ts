import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { unwrapExpression } from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

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

// The context stage runs once per file, so match is shared by every SpreadElement the report wiring feeds to matches.
const conditionalArraySpreadMatches = (context: RuleContext) => {
  const match = detection(context)

  const matches = (spread: ts.SpreadElement): ReadonlyArray<Detection> => {
    if (!ts.isArrayLiteralExpression(spread.parent)) return []

    const expression = unwrapExpression(spread.expression)
    if (!ts.isConditionalExpression(expression)) return []

    const emptyThenNonEmpty = [
      isEmptyArrayLiteral(expression.whenTrue),
      isNonEmptyArrayBranch(expression.whenFalse)
    ].every(Boolean)
    const nonEmptyThenEmpty = [
      isNonEmptyArrayBranch(expression.whenTrue),
      isEmptyArrayLiteral(expression.whenFalse)
    ].every(Boolean)

    return [emptyThenNonEmpty, nonEmptyThenEmpty].some(Boolean)
      ? [match({ node: spread, message, hint })]
      : []
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.SpreadElement])(ts.isSpreadElement)(
  conditionalArraySpreadMatches
)

export const preferEffectArrayAppendAll: RuleCheck = check
