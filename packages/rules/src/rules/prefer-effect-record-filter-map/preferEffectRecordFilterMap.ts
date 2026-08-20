import { Array, Function, Schema, flow } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import { unwrapExpression } from "../../internal/support/unwrapExpression.js"
import { strictEqual } from "../../internal/equivalence.js"
import { objectLiteralPropertyCount } from "./objectLiteralPropertyCount.js"

// PreferEffectRecordFilterMapFact exists because its fields form one stable data contract used by the linter.
export const PreferEffectRecordFilterMapFact = Schema.Struct({})

export interface PreferEffectRecordFilterMapFact extends Schema.Schema.Type<
  typeof PreferEffectRecordFilterMapFact
> {}

// emptyPreferEffectRecordFilterMapFact exists because its fields form one stable data contract used by the linter.
export const emptyPreferEffectRecordFilterMapFact = PreferEffectRecordFilterMapFact.make({})

const hasNoProperties = flow(objectLiteralPropertyCount, strictEqual(0))

const hasSomeProperties = (expression: ts.Expression) => objectLiteralPropertyCount(expression) > 0

const matchConditionalObjectSpread = (spread: ts.SpreadAssignment) => {
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

  if (!Array.some(checks, Boolean)) {
    return Array.empty()
  }

  const match = makeNodeMatch(spread, emptyPreferEffectRecordFilterMapFact)

  return Array.of(match)
}

const conditionalObjectSpreadMatches = Function.constant(matchConditionalObjectSpread)

const kinds = Array.of(ts.SyntaxKind.SpreadAssignment)

export const preferEffectRecordFilterMapScanner = makeNodeScanner(kinds)(ts.isSpreadAssignment)(
  conditionalObjectSpreadMatches
)
