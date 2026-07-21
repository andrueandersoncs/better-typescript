import { makeFindings } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferEffectFunctionConstantMatcher,
  type PreferEffectFunctionConstantFact
} from "@better-typescript/matchers/builtins/preferEffectFunctionConstant"
import { makeBuiltinPolicy } from "../definePolicy.js"

const message = "Avoid a handwritten constant thunk."

const preferEffectFunctionConstantGuidance: Guidance<PreferEffectFunctionConstantFact> =
  () => (match) => {
    const { expressionText } = match.fact

    return makeFindings(
      match.target,
      message,
      `Use Function.constant(${expressionText}) from Effect when a zero-argument function only returns a stable value. ` +
        "Function.constant captures that value once and returns a zero-argument function.",
      match.fact
    )
  }

export const preferEffectFunctionConstant = makeBuiltinPolicy(
  "prefer-effect-function-constant",
  preferEffectFunctionConstantMatcher,
  preferEffectFunctionConstantGuidance
)
