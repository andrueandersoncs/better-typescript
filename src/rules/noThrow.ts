import * as ts from "typescript"
import { Kind } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const throwStatement = new Kind({ kind: ts.SyntaxKind.ThrowStatement })

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

const spec = new MatcherRuleSpec({
  id: "no-throw",
  description: "Disallow throw statements in favor of Effect errors.",
  matcher: throwStatement,
  message: "Avoid throwing errors with throw.",
  hint:
    "Create a custom error with Schema.TaggedError, then yield it instead, for example: " +
    'class CustomError extends Schema.TaggedError<CustomError>("CustomError")("CustomError", {}) {}; yield* new CustomError().',
  example
})

export const noThrow = matcherRule(spec)
