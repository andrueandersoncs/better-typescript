import * as ts from "typescript"
import { And, Anything, Kind, Or, Property } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const anything = new Anything()

const hasStopCondition = new Property({ name: "condition", term: anything })

const hasInitializer = new Property({ name: "initializer", term: anything })

const hasIncrementor = new Property({ name: "incrementor", term: anything })

const hasIterator = new Or({ terms: [hasInitializer, hasIncrementor] })

const forStatement = new Kind({ kind: ts.SyntaxKind.ForStatement })

// A for(;;) loop without a stop condition or without any iterator clause is an intentional infinite/manual loop, not an iteration the Array module replaces.
const iteratorForLoop = new And({
  terms: [forStatement, hasStopCondition, hasIterator]
})

const badExample = new ExampleSnippet({
  filePath: "src/transform.ts",
  code: `declare const items: ReadonlyArray<number>

export const doubled: Array<number> = []

for (let i = 0; i < items.length; i++) {
  doubled.push(items[i] * 2)
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/transform.ts",
  code: `import { Array } from "effect"

declare const items: ReadonlyArray<number>

export const doubled = Array.map(items, (item) => item * 2)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

const spec = new MatcherRuleSpec({
  id: "no-for-loops",
  description:
    "Disallow iterator-based for loops in favor of Effect collection operations.",
  matcher: iteratorForLoop,
  message: "Avoid imperative logic in iterator-based for loops.",
  hint:
    "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
    "Array.filter(), or Array.flatMap(), instead.",
  example
})

export const noForLoops = matcherRule(spec)
