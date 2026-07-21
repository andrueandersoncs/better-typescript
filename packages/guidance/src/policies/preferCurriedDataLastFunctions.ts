import { preferCurriedDataLastFunctionsMatcher } from "@better-typescript/matchers/builtins/preferCurriedDataLastFunctions"
import { defineSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid rest parameters and multiple runtime parameters in one function."

const hint =
  "Curry runtime parameters into unary functions so configuration comes first and the primary data value is supplied last."

export const preferCurriedDataLastFunctions = defineSilentBuiltinPolicy(
  "prefer-curried-data-last-functions",
  preferCurriedDataLastFunctionsMatcher,
  factGuidance(message, hint)
)
