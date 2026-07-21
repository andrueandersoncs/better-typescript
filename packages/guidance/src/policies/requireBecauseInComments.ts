import { requireBecauseInCommentsMatcher } from "@better-typescript/matchers/builtins/requireBecauseInComments"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = 'Comments must include the word "because".'

const hint =
  "Delete comments that only restate what the code does. Otherwise, explain why the " +
  'code or approach is necessary using the word "because". Every comment carries this ' +
  "obligation; there are no exempt comment forms."

export const requireBecauseInComments = defineBuiltinPolicy(
  "require-because-in-comments",
  requireBecauseInCommentsMatcher,
  factGuidance(message, hint)
)
