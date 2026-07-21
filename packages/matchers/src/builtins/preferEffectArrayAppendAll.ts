import { Array, Function, flow, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"
import { unwrapExpression } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

// PreferEffectArrayAppendAllFact is empty payload because guidance and matchers share identity.
export const PreferEffectArrayAppendAllFact = Schema.Struct({})

export interface PreferEffectArrayAppendAllFact extends Schema.Schema.Type<
  typeof PreferEffectArrayAppendAllFact
> {}

// emptyPreferEffectArrayAppendAllFact is empty because guidance and matchers share identity.
export const emptyPreferEffectArrayAppendAllFact = PreferEffectArrayAppendAllFact.make({})

const arrayLiteralElementCount = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)

  return ts.isArrayLiteralExpression(unwrapped) ? unwrapped.elements.length : -1
}

const isEmptyArrayLiteral = flow(arrayLiteralElementCount, strictEqual(0))

const isNonEmptyArrayBranch = (expression: ts.Expression) =>
  arrayLiteralElementCount(expression) !== 0

const matchConditionalArraySpread = (spread: ts.SpreadElement) => {
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

  if (!Array.some(checks, Boolean)) {
    return Array.empty()
  }

  const match = nodeMatch(spread, emptyPreferEffectArrayAppendAllFact)

  return Array.of(match)
}

const conditionalArraySpreadMatches = Function.constant(matchConditionalArraySpread)

const kinds = Array.of(ts.SyntaxKind.SpreadElement)

export const preferEffectArrayAppendAllMatcher = nodeMatcher(kinds)(ts.isSpreadElement)(
  conditionalArraySpreadMatches
)
