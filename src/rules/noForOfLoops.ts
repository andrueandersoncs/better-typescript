import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-for-of-loops"

const forOfMatches = (
  forOfStatement: ts.ForOfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  createRuleMatch(context, {
    ruleId,
    node: forOfStatement,
    message: "Avoid imperative logic in for..of loops.",
    hint:
      "Use immutable collection logic such as Array.prototype.map(), " +
      "Array.prototype.reduce(), Array.prototype.filter(), Array.prototype.flatMap(), " +
      "or Streams for async iterables instead."
  })
]

const check = onNode([ts.SyntaxKind.ForOfStatement], ts.isForOfStatement, forOfMatches)

const badExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `const names = []
for (const user of users) {
  names.push(user.name)
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `const names = users.map((user) => user.name)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noForOfLoops = new Rule({
  id: ruleId,
  description: "Disallow for..of loops in favor of immutable collection operations.",
  example,
  check
})
