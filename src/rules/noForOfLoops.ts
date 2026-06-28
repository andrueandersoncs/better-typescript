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
      "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
      "Array.filter(), or Array.flatMap(), instead."
  })
]

const check = onNode(
  [ts.SyntaxKind.ForOfStatement],
  ts.isForOfStatement,
  forOfMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `const names = []
for (const user of users) {
  names.push(user.name)
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `const names = Array.map(users, (user) => user.name)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noForOfLoops = new Rule({
  id: ruleId,
  description:
    "Disallow for..of loops in favor of Effect collection operations.",
  example,
  check
})
