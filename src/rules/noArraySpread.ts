import * as ts from "typescript"
import { And, Kind, Parent } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const spreadElement = new Kind({ kind: ts.SyntaxKind.SpreadElement })

const arrayLiteral = new Kind({ kind: ts.SyntaxKind.ArrayLiteralExpression })

const inArrayLiteral = new Parent({ term: arrayLiteral })

// Spread in call arguments keeps its CallExpression parent and stays exempt; only array construction is flagged.
const arraySpread = new And({ terms: [spreadElement, inArrayLiteral] })

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

const spec = new MatcherRuleSpec({
  id: "no-array-spread",
  description:
    "Disallow the array-spread operator for constructing arrays in favor of " +
    "Effect Array module functions such as Array.append, Array.prepend, " +
    "Array.appendAll, Array.prependAll, and Array.fromIterable.",
  matcher: arraySpread,
  message: "Avoid the array-spread operator when constructing arrays.",
  hint:
    "Use Effect's Array module instead: Array.append or Array.prepend to add a " +
    "single element, Array.appendAll or Array.prependAll to combine two arrays, " +
    "and Array.fromIterable to materialize an iterable.",
  example
})

export const noArraySpread = matcherRule(spec)
