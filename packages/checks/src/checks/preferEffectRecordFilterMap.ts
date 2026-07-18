import { Array } from "effect"
import * as ts from "typescript"
import { unwrapExpression } from "./support/tsNode.js"
import { makeCheck } from "../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeDetection } from "@better-typescript/core/engine/check"
const message = "Avoid conditional object spreads."

const hint =
  "Build a record of candidate properties and use Record.filterMap from Effect with " +
  "Result.succeed/Result.fail (or Result.fromNullishOr) to keep only present entries."

const objectLiteralPropertyCount = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)

  return ts.isObjectLiteralExpression(unwrapped) ? unwrapped.properties.length : 0
}

const hasNoProperties = (expression: ts.Expression) => objectLiteralPropertyCount(expression) === 0

const hasSomeProperties = (expression: ts.Expression) => objectLiteralPropertyCount(expression) > 0

const conditionalObjectSpreadMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (spread: ts.SpreadAssignment): ReadonlyArray<Detection> => {
    const expression = unwrapExpression(spread.expression)
    if (!ts.isConditionalExpression(expression)) return Array.empty()

    const emptyWhenTrue = hasNoProperties(expression.whenTrue)
    const nonEmptyWhenFalse = hasSomeProperties(expression.whenFalse)
    const emptyThenNonEmptyConditions = Array.make(emptyWhenTrue, nonEmptyWhenFalse)
    const emptyThenNonEmptyElse = Array.every(emptyThenNonEmptyConditions, Boolean)
    const nonEmptyWhenTrue = hasSomeProperties(expression.whenTrue)
    const emptyWhenFalse = hasNoProperties(expression.whenFalse)
    const nonEmptyThenEmptyConditions = Array.make(nonEmptyWhenTrue, emptyWhenFalse)
    const nonEmptyThenEmptyElse = Array.every(nonEmptyThenEmptyConditions, Boolean)
    const checks = Array.make(emptyThenNonEmptyElse, nonEmptyThenEmptyElse)
    const detection = match({ node: spread, message, hint })
    return Array.some(checks, Boolean) ? Array.of(detection) : Array.empty()
  }

  return matches
}

const kinds = Array.of(ts.SyntaxKind.SpreadAssignment)

export const preferEffectRecordFilterMap = makeCheck(
  "prefer-effect-record-filter-map",
  kinds,
  ts.isSpreadAssignment,
  conditionalObjectSpreadMatches
)
