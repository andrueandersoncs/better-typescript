import * as ts from "typescript"
import { Kind } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const switchStatement = new Kind({ kind: ts.SyntaxKind.SwitchStatement })

const badExample = new ExampleSnippet({
  filePath: "src/status.ts",
  code: `declare const status: "active" | "inactive" | "unknown"
declare const handleActive: () => string
declare const handleInactive: () => string
declare const handleUnknown: () => string

export const describeStatus = (): string => {
  switch (status) {
    case "active": return handleActive()
    case "inactive": return handleInactive()
    default: return handleUnknown()
  }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/status.ts",
  code: `import { Match, pipe } from "effect"

declare const status: "active" | "inactive" | "unknown"
declare const handleActive: () => string
declare const handleInactive: () => string
declare const handleUnknown: () => string

export const describeStatus = (): string =>
  pipe(
    Match.value(status),
    Match.when("active", handleActive),
    Match.when("inactive", handleInactive),
    Match.when("unknown", handleUnknown),
    Match.exhaustive
  )`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

const spec = new MatcherRuleSpec({
  id: "no-switch-statements",
  description: "Disallow switch statements in favor of Effect Match.",
  matcher: switchStatement,
  message: "Avoid switch statements.",
  hint:
    "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
    "so every case is handled explicitly.",
  example
})

export const noSwitchStatements = matcherRule(spec)
