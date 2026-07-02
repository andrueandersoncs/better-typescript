import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-for-loops"

// The context stage runs once per file, so match is shared by every ForStatement the dispatcher feeds to matches.
const forMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)

  const matches = (forStatement: ts.ForStatement): ReadonlyArray<RuleMatch> => {
    const condition = Option.fromNullable(forStatement.condition)
    const initializer = Option.fromNullable(forStatement.initializer)
    const incrementor = Option.fromNullable(forStatement.incrementor)
    const hasStopCondition = Option.isSome(condition)
    const hasInitializer = Option.isSome(initializer)
    const hasIncrementor = Option.isSome(incrementor)
    const hasIterator = [hasInitializer, hasIncrementor].some(Boolean)
    const hasIteratorAndStopCondition = [hasStopCondition, hasIterator].every(
      Boolean
    )

    return hasIteratorAndStopCondition
      ? [
          match({
            ruleId,
            node: forStatement,
            message: "Avoid imperative logic in iterator-based for loops.",
            hint:
              "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
              "Array.filter(), or Array.flatMap(), instead."
          })
        ]
      : []
  }

  return matches
}

const check = onNode([ts.SyntaxKind.ForStatement])(ts.isForStatement)(
  forMatches
)

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

export const noForLoops = new Rule({
  id: ruleId,
  description:
    "Disallow iterator-based for loops in favor of Effect collection operations.",
  example,
  check
})
