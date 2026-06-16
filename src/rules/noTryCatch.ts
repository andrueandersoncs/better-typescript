import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-try-catch"

const tryStatementMatches = (
  tryStatement: ts.TryStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  createRuleMatch(context, {
    ruleId,
    node: tryStatement,
    message: "Avoid try/catch for error handling.",
    hint:
      "Model effectful code that can fail as an Effect and declare its failures as explicit " +
      'Schema.TaggedError classes, for example: class FetchError extends Schema.TaggedError<FetchError>("FetchError")("FetchError", {}) {}. ' +
      "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catchAll) instead of catching inside a try block."
  })
]

const check = onNode([ts.SyntaxKind.TryStatement], ts.isTryStatement, tryStatementMatches)

export const noTryCatch = new Rule({
  id: ruleId,
  description: "Disallow try/catch in favor of Effect with Schema.TaggedError and Effect.catchTag.",
  check
})
