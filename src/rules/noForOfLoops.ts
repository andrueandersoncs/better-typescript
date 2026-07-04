import * as ts from "typescript"
import { Kind } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const forOfStatement = new Kind({ kind: ts.SyntaxKind.ForOfStatement })

const badExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `declare const users: ReadonlyArray<{ readonly name: string }>

export const names: Array<string> = []

for (const user of users) {
  names.push(user.name)
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `import { Array, Struct } from "effect"

declare const users: ReadonlyArray<{ readonly name: string }>

export const names = Array.map(users, Struct.get("name"))`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

const spec = new MatcherRuleSpec({
  id: "no-for-of-loops",
  description:
    "Disallow for..of loops in favor of Effect collection operations.",
  matcher: forOfStatement,
  message: "Avoid imperative logic in for..of loops.",
  hint:
    "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
    "Array.filter(), or Array.flatMap(), instead.",
  example
})

export const noForOfLoops = matcherRule(spec)
