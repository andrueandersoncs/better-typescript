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

// The context stage runs once per file, so match is shared by every SpreadElement the dispatcher feeds to matches.
const arraySpreadMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)

  const matches = (spread: ts.SpreadElement): ReadonlyArray<RuleMatch> =>
    ts.isArrayLiteralExpression(spread.parent)
      ? [match({ ruleId, node: spread, message, hint })]
      : []

  return matches
}

const check = onNode([ts.SyntaxKind.SpreadElement])(ts.isSpreadElement)(
  arraySpreadMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/items.ts",
  code: `declare const left: ReadonlyArray<string>
declare const right: ReadonlyArray<string>
declare const items: ReadonlyArray<string>
declare const extra: string
declare const first: string

export const combined = [...left, ...right]
export const withTail = [...items, extra]
export const withHead = [first, ...items]`
})

const goodExample = new ExampleSnippet({
  filePath: "src/items.ts",
  code: `import { Array } from "effect"

declare const left: ReadonlyArray<string>
declare const right: ReadonlyArray<string>
declare const items: ReadonlyArray<string>
declare const extra: string
declare const first: string

export const combined = Array.appendAll(left, right)
export const withTail = Array.append(items, extra)
export const withHead = Array.prepend(items, first)`
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
