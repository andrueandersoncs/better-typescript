import * as ts from "typescript"
import { Kind } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const forInStatement = new Kind({ kind: ts.SyntaxKind.ForInStatement })

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

const spec = new MatcherRuleSpec({
  id: "no-for-in-loops",
  description: "Disallow for..in loops in favor of Effect Record operations.",
  matcher: forInStatement,
  message: "Avoid imperative logic in for..in loops.",
  hint:
    "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
    "or Record.toEntries(), instead.",
  example
})

export const noForInLoops = matcherRule(spec)
