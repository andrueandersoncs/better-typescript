import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferEffectFunctionConstantMatcher,
  type PreferEffectFunctionConstantFact
} from "@better-typescript/matchers/builtins/preferEffectFunctionConstant"
import { defineBuiltinPolicy } from "../definePolicy.js"

const message = "Avoid a handwritten constant thunk."

const preferEffectFunctionConstantGuidance: Guidance<PreferEffectFunctionConstantFact> =
  () => (match) => {
    const { expressionText } = match.fact

    return oneFinding(
      match.target,
      message,
      `Use Function.constant(${expressionText}) from Effect when a zero-argument function only returns a stable value. ` +
        "Function.constant captures that value once and returns a zero-argument function.",
      match.fact
    )
  }

export const preferEffectFunctionConstant = defineBuiltinPolicy(
  "prefer-effect-function-constant",
  preferEffectFunctionConstantMatcher,
  preferEffectFunctionConstantGuidance
)
