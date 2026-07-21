import { preferEffectArrayAppendAllMatcher } from "@better-typescript/matchers/builtins/preferEffectArrayAppendAll"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid conditional array spreads."

const hint =
  "Use Array.appendAll from Effect to combine arrays instead of spreading a conditional " +
  "expression that chooses between an array and an empty array literal."

export const preferEffectArrayAppendAll = makeBuiltinPolicy(
  "prefer-effect-array-append-all",
  preferEffectArrayAppendAllMatcher,
  factGuidance(message, hint)
)
