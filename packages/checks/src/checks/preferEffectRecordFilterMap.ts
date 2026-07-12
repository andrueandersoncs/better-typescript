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
    if (!ts.isConditionalExpression(expression)) return Array.empty()

    const value174 = hasNoProperties(expression.whenTrue)
    const value175 = hasSomeProperties(expression.whenFalse)
    const conditions2 = Array.make(value174, value175)

    const emptyThenNonEmptyElse = Array.every(conditions2, Boolean)

    const value176 = hasSomeProperties(expression.whenTrue)
    const value177 = hasNoProperties(expression.whenFalse)
    const conditions = Array.make(value176, value177)

    const nonEmptyThenEmptyElse = Array.every(conditions, Boolean)

    const values178 = Array.make(emptyThenNonEmptyElse, nonEmptyThenEmptyElse)
    const value179 = match({ node: spread, message, hint })
    return Array.some(values178, Boolean) ? Array.of(value179) : Array.empty()
  }

  return matches
}

const values180 = Array.of(ts.SyntaxKind.SpreadAssignment)

const check = nodeCheck(values180)(ts.isSpreadAssignment)(
  conditionalObjectSpreadMatches
)

export const preferEffectRecordFilterMap: Check = check

export const preferEffectRecordFilterMapExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-record-filter-map")
