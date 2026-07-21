import { noErrorTypeMatcher } from "@better-typescript/matchers/builtins/noErrorType"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid the built-in Error type."

const hint =
  "Use a specific tagged error type for known failures, preserve the caller's error type with a " +
  "type parameter, or use unknown at an untyped boundary."

export const noErrorType = makeBuiltinPolicy(
  "no-error-type",
  noErrorTypeMatcher,
  factGuidance(message, hint)
)
