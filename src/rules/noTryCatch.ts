import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-try-catch"

// The context stage runs once per file, so match is shared by every TryStatement the dispatcher feeds to matches.
const tryStatementMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)

  const matches = (tryStatement: ts.TryStatement): ReadonlyArray<RuleMatch> => [
    match({
      ruleId,
      node: tryStatement,
      message: "Avoid try/catch for error handling.",
      hint:
        "Model effectful code that can fail as an Effect and declare its failures as explicit " +
        'Schema.TaggedError classes, for example: class FetchError extends Schema.TaggedError<FetchError>("FetchError")("FetchError", {}) {}. ' +
        "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catchAll) instead of catching inside a try block."
    })
  ]

  return matches
}

const check = onNode([ts.SyntaxKind.TryStatement])(ts.isTryStatement)(
  tryStatementMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/file.ts",
  code: `interface Config {
  readonly name: string
}

declare const readFile: (path: string) => string
declare const parse: (data: string) => Config
declare const defaultValue: Config

export const loadConfig = (path: string): Config => {
  try {
    const data = readFile(path)
    return parse(data)
  } catch (err) {
    return defaultValue
  }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/file.ts",
  code: `import { Effect, Schema, pipe } from "effect"

class ReadError extends Schema.TaggedError<ReadError>("ReadError")("ReadError", {}) {}

interface Config {
  readonly name: string
}

declare const path: string
declare const readFile: (path: string) => Effect.Effect<string, ReadError>
declare const parse: (data: string) => Effect.Effect<Config>
declare const defaultValue: Config

export const program = pipe(
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
