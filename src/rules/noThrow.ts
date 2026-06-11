import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-throw"

const throwMatches = (
  throwStatement: ts.ThrowStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  createRuleMatch(context, {
    ruleId,
    node: throwStatement,
    message: "Avoid throwing errors with throw.",
    hint:
      "Create a custom error with Schema.TaggedError, then yield it instead, for example: " +
      'class CustomError extends Schema.TaggedError<CustomError>("CustomError")("CustomError", {}) {}; yield* new CustomError().'
  })
]

const check = onNode([ts.SyntaxKind.ThrowStatement], ts.isThrowStatement, throwMatches)

export const noThrow = new Rule({
  id: ruleId,
  description: "Disallow throw statements in favor of Effect errors.",
  check
})
