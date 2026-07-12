import { Array } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { unwrapExpression } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
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

const conditionalObjectSpreadMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (spread: ts.SpreadAssignment): ReadonlyArray<Detection> => {
    const expression = unwrapExpression(spread.expression)
    if (!ts.isConditionalExpression(expression)) return []

    const conditions2 = [
      hasNoProperties(expression.whenTrue),
      hasSomeProperties(expression.whenFalse)
    ]

    const emptyThenNonEmptyElse = Array.every(conditions2, Boolean)

    const conditions = [
      hasSomeProperties(expression.whenTrue),
      hasNoProperties(expression.whenFalse)
    ]

    const nonEmptyThenEmptyElse = Array.every(conditions, Boolean)

    return Array.some([emptyThenNonEmptyElse, nonEmptyThenEmptyElse], Boolean)
      ? [match({ node: spread, message, hint })]
      : []
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.SpreadAssignment])(
  ts.isSpreadAssignment
)(conditionalObjectSpreadMatches)

export const preferEffectRecordFilterMap: Check = check

export const preferEffectRecordFilterMapExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-record-filter-map")
