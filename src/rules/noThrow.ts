import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { Rule } from "./types.js"

const ruleId = "no-throw"

export const noThrow: Rule = {
  id: ruleId,
  description: "Disallow throw statements in favor of Effect errors.",
  check: onNode([ts.SyntaxKind.ThrowStatement], ts.isThrowStatement, (throwStatement, context) => [
    createRuleMatch(context, {
      ruleId,
      node: throwStatement,
      message: "Avoid throwing errors with throw.",
      hint:
        "Create a custom error with Schema.TaggedError, then yield it instead, for example: " +
        'class CustomError extends Schema.TaggedError<CustomError>("CustomError")("CustomError", {}) {}; yield* new CustomError().'
    })
  ])
}
