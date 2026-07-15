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
const message = "Avoid conditional object spreads."

const hint =
  "Build a record of candidate properties and use Record.filterMap from Effect with " +
  "Option.some/Option.none (or Option.fromNullable) to keep only present entries."

const objectLiteralPropertyCount = (expression: ts.Expression): number => {
  const unwrapped = unwrapExpression(expression)

  return ts.isObjectLiteralExpression(unwrapped) ? unwrapped.properties.length : 0
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

const check = nodeCheck(kinds)(ts.isSpreadAssignment)(conditionalObjectSpreadMatches)

export const preferEffectRecordFilterMap: Check = check

export const preferEffectRecordFilterMapExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-record-filter-map")
