import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-try-catch"

const tryStatementMatches =
  (context: RuleContext) =>
  (tryStatement: ts.TryStatement): ReadonlyArray<RuleMatch> => [
    createRuleMatch(context)({
      ruleId,
      node: tryStatement,
      message: "Avoid try/catch for error handling.",
      hint:
        "Model effectful code that can fail as an Effect and declare its failures as explicit " +
        'Schema.TaggedError classes, for example: class FetchError extends Schema.TaggedError<FetchError>("FetchError")("FetchError", {}) {}. ' +
        "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catchAll) instead of catching inside a try block."
    })
  ]

const check = onNode([ts.SyntaxKind.TryStatement])(ts.isTryStatement)(tryStatementMatches)

const badExample = new ExampleSnippet({
  filePath: "src/file.ts",
  code: `try {
  const data = readFile(path)
  return parse(data)
} catch (err) {
  return defaultValue
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/file.ts",
  code: `class ReadError extends Schema.TaggedError<ReadError>("ReadError")("ReadError", {}) {}

const program = pipe(
  readFile(path),
  Effect.flatMap(parse),
  Effect.catchTag("ReadError", () => Effect.succeed(defaultValue))
)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noTryCatch = new Rule({
  id: ruleId,
  description:
    "Disallow try/catch in favor of Effect with Schema.TaggedError and Effect.catchTag.",
  example,
  check
})
