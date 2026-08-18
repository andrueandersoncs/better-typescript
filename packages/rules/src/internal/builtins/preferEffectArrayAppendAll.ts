import { Array, Function, Schema, flow } from "effect"
import * as ts from "typescript"
import { nodeScanner } from "../scanner/nodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import { unwrapExpression } from "../support/unwrapExpression.js"
import { strictEqual } from "../equivalence.js"
import { arrayLiteralElementCount } from "./arrayLiteralElementCount.js"

// PreferEffectArrayAppendAllFact exists because its fields form one stable data contract used by the linter.
export const PreferEffectArrayAppendAllFact = Schema.Struct({})

export interface PreferEffectArrayAppendAllFact extends Schema.Schema.Type<
  typeof PreferEffectArrayAppendAllFact
> {}

// emptyPreferEffectArrayAppendAllFact exists because its fields form one stable data contract used by the linter.
export const emptyPreferEffectArrayAppendAllFact = PreferEffectArrayAppendAllFact.make({})

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

  const match = makeNodeMatch(spread, emptyPreferEffectArrayAppendAllFact)

  return Array.of(match)
}

const conditionalArraySpreadMatches = Function.constant(matchConditionalArraySpread)

const kinds = Array.of(ts.SyntaxKind.SpreadElement)

export const preferEffectArrayAppendAllScanner = nodeScanner(kinds)(ts.isSpreadElement)(
  conditionalArraySpreadMatches
)
