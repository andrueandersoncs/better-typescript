import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-switch-statements"

// The context stage runs once per file, so match is shared by every SwitchStatement the dispatcher feeds to matches.
const switchStatementMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)

  const matches = (
    switchStatement: ts.SwitchStatement
  ): ReadonlyArray<RuleMatch> => [
    match({
      ruleId,
      node: switchStatement,
      message: "Avoid switch statements.",
      hint:
        "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
        "so every case is handled explicitly."
    })
  ]

  return matches
}

const check = onNode([ts.SyntaxKind.SwitchStatement])(ts.isSwitchStatement)(
  switchStatementMatches
)

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

export const noSwitchStatements = new Rule({
  id: ruleId,
  description: "Disallow switch statements in favor of Effect Match.",
  example,
  check
})
