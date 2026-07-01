import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-for-in-loops"

const forInMatches =
  (context: RuleContext) =>
  (forInStatement: ts.ForInStatement): ReadonlyArray<RuleMatch> => [
    createRuleMatch(context)({
      ruleId,
      node: forInStatement,
      message: "Avoid imperative logic in for..in loops.",
      hint:
        "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
        "or Record.toEntries(), instead."
    })
  ]

const check = onNode([ts.SyntaxKind.ForInStatement])(ts.isForInStatement)(
  forInMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/config.ts",
  code: `declare const config: Record<string, string>

export const result: Record<string, string> = {}

for (const key in config) {
  result[key] = config[key].toUpperCase()
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/config.ts",
  code: `import { Record } from "effect"

declare const config: Record.ReadonlyRecord<string, string>

export const result = Record.map(config, (value) => value.toUpperCase())`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noForInLoops = new Rule({
  id: ruleId,
  description: "Disallow for..in loops in favor of Effect Record operations.",
  example,
  check
})
