import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { unwrapExpression } from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const message = "Avoid conditional object spreads."

const hint =
  "Build a record of candidate properties and use Record.filterMap from Effect with " +
  "Option.some/Option.none (or Option.fromNullable) to keep only present entries."

const objectLiteralPropertyCount = (expression: ts.Expression): number => {
  const unwrapped = unwrapExpression(expression)

  return ts.isObjectLiteralExpression(unwrapped)
    ? unwrapped.properties.length
    : 0
}

const hasNoProperties = (expression: ts.Expression): boolean =>
  objectLiteralPropertyCount(expression) === 0

const hasSomeProperties = (expression: ts.Expression): boolean =>
  objectLiteralPropertyCount(expression) > 0

// The context stage runs once per file, so the hoisted match is shared by every SpreadAssignment the report wiring feeds to matches.
const conditionalObjectSpreadMatches = (context: RuleContext) => {
  const match = detection(context)

  const matches = (spread: ts.SpreadAssignment): ReadonlyArray<Detection> => {
    const expression = unwrapExpression(spread.expression)
    if (!ts.isConditionalExpression(expression)) return []

    const emptyThenNonEmptyElse = [
      hasNoProperties(expression.whenTrue),
      hasSomeProperties(expression.whenFalse)
    ].every(Boolean)
    const nonEmptyThenEmptyElse = [
      hasSomeProperties(expression.whenTrue),
      hasNoProperties(expression.whenFalse)
    ].every(Boolean)

    return [emptyThenNonEmptyElse, nonEmptyThenEmptyElse].some(Boolean)
      ? [match({ node: spread, message, hint })]
      : []
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.SpreadAssignment])(
  ts.isSpreadAssignment
)(conditionalObjectSpreadMatches)

export const preferEffectRecordFilterMap: RuleCheck = check
