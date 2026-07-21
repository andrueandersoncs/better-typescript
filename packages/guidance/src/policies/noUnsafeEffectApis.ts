import { noUnsafeEffectApisMatcher } from "@better-typescript/matchers/builtins/noUnsafeEffectApis"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid unsafe Effect APIs."

const hint =
  "Use the safe Effect API and handle its Effect, Option, Result, or identity semantics " +
  "explicitly. If no safe counterpart preserves the required behavior, redesign the boundary " +
  "instead of using an API whose name contains unsafe."

export const noUnsafeEffectApis = defineBuiltinPolicy(
  "no-unsafe-effect-apis",
  noUnsafeEffectApisMatcher,
  factGuidance(message, hint)
)
