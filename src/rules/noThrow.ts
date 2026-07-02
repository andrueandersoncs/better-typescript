import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-throw"

// The context stage runs once per file, so match is shared by every ThrowStatement the dispatcher feeds to matches.
const throwMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)

  const matches = (
    throwStatement: ts.ThrowStatement
  ): ReadonlyArray<RuleMatch> => [
    match({
      ruleId,
      node: throwStatement,
      message: "Avoid throwing errors with throw.",
      hint:
        "Create a custom error with Schema.TaggedError, then yield it instead, for example: " +
        'class CustomError extends Schema.TaggedError<CustomError>("CustomError")("CustomError", {}) {}; yield* new CustomError().'
    })
  ]

  return matches
}

const check = onNode([ts.SyntaxKind.ThrowStatement])(ts.isThrowStatement)(
  throwMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/user.ts",
  code: `export const requireName = (name: string | null): string => {
  if (name === null) {
    throw new Error("User not found")
  }

  return name
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/user.ts",
  code: `import { Effect, Schema } from "effect"

class UserNotFound extends Schema.TaggedError<UserNotFound>("UserNotFound")("UserNotFound", {}) {}

export const requireName = Effect.fn("requireName")(function* (name: string | null) {
  if (name === null) {
    return yield* new UserNotFound()
  }

  return name
})`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noThrow = new Rule({
  id: ruleId,
  description: "Disallow throw statements in favor of Effect errors.",
  example,
  check
})
