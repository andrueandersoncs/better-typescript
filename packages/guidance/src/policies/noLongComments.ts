import { noLongCommentsMatcher } from "@better-typescript/matchers/builtins/noLongComments"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Comments must be at most 100 characters."

const hint =
  "Keep each comment within 100 characters because longer comments stop reading as code " +
  "annotations. State the single load-bearing reason; move longer explanations into an " +
  "Architectural Decision Record (ADR) in the adrs/ directory instead."

export const noLongComments = defineBuiltinPolicy(
  "no-long-comments",
  noLongCommentsMatcher,
  factGuidance(message, hint)
)
