import { Array, Function, flow, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"
import { unwrapExpression } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

// PreferEffectRecordFilterMapFact is empty payload because guidance and matchers share identity.
export const PreferEffectRecordFilterMapFact = Schema.Struct({})

export interface PreferEffectRecordFilterMapFact extends Schema.Schema.Type<
  typeof PreferEffectRecordFilterMapFact
> {}

// emptyPreferEffectRecordFilterMapFact is empty because guidance and matchers share identity.
export const emptyPreferEffectRecordFilterMapFact = PreferEffectRecordFilterMapFact.make({})

const objectLiteralPropertyCount = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)

  return ts.isObjectLiteralExpression(unwrapped) ? unwrapped.properties.length : 0
}

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

  const match = nodeMatch(spread, emptyPreferEffectRecordFilterMapFact)

  return Array.of(match)
}

const conditionalObjectSpreadMatches = Function.constant(matchConditionalObjectSpread)

const kinds = Array.of(ts.SyntaxKind.SpreadAssignment)

export const preferEffectRecordFilterMapMatcher = nodeMatcher(kinds)(ts.isSpreadAssignment)(
  conditionalObjectSpreadMatches
)
