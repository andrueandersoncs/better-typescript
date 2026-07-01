import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-array-spread"

const message = "Avoid the array-spread operator when constructing arrays."

const hint =
  "Use Effect's Array module instead: Array.append or Array.prepend to add a " +
  "single element, Array.appendAll or Array.prependAll to combine two arrays, " +
  "and Array.fromIterable to materialize an iterable."

const arraySpreadMatches =
  (context: RuleContext) =>
  (spread: ts.SpreadElement): ReadonlyArray<RuleMatch> => ts.isArrayLiteralExpression(spread.parent)
    ? [createRuleMatch(context)({ ruleId, node: spread, message, hint })]
    : []

const check = onNode([ts.SyntaxKind.SpreadElement])(ts.isSpreadElement)(arraySpreadMatches)

const badExample = new ExampleSnippet({
  filePath: "src/items.ts",
  code: `const combined = [...left, ...right]
const withTail = [...items, extra]
const withHead = [first, ...items]`
})

const goodExample = new ExampleSnippet({
  filePath: "src/items.ts",
  code: `const combined = Array.appendAll(left, right)
const withTail = Array.append(items, extra)
const withHead = Array.prepend(items, first)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noArraySpread = new Rule({
  id: ruleId,
  description:
    "Disallow the array-spread operator for constructing arrays in favor of " +
    "Effect Array module functions such as Array.append, Array.prepend, " +
    "Array.appendAll, Array.prependAll, and Array.fromIterable.",
  example,
  check
})
