import { noMultiLineCommentsMatcher } from "@better-typescript/matchers/builtins/noMultiLineComments"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid multi-line comments."

const hint =
  "Code should be self-documenting. Use isolated single-line comments only to explain WHY " +
  "something is done, never HOW. Block comments and JSDoc (/* ... */ and /** ... */) are " +
  "disallowed entirely. Consecutive single-line comments form a multi-line comment even when " +
  "blank lines separate them, so keep one comment per explanation. For architectural decisions " +
  "that require longer explanation, create an Architectural Decision Record (ADR) as a " +
  "markdown file in the adrs/ directory instead."

export const noMultiLineComments = defineBuiltinPolicy(
  "no-multi-line-comments",
  noMultiLineCommentsMatcher,
  factGuidance(message, hint)
)
