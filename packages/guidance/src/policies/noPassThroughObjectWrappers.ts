import { noPassThroughObjectWrappersMatcher } from "@better-typescript/matchers/builtins/noPassThroughObjectWrappers"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid a function that only repackages its parameters for another constructor."

const hint =
  "Inline the constructor or factory call at each caller. Keep a function only when it adds " +
  "policy, validation, defaults, or behavior."

export const noPassThroughObjectWrappers = makeBuiltinPolicy(
  "no-pass-through-object-wrappers",
  noPassThroughObjectWrappersMatcher,
  factGuidance(message, hint)
)
