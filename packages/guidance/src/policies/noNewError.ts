import { noNewErrorMatcher } from "@better-typescript/matchers/builtins/noNewError"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid using new Error() directly."

const hint =
  "Declare a custom error with Effect Schema.TaggedErrorClass, then use new CustomError() " +
  "instead of bare new Error()."

export const noNewError = defineBuiltinPolicy(
  "no-new-error",
  noNewErrorMatcher,
  factGuidance(message, hint)
)
