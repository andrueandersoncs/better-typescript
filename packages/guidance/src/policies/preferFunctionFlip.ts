import { preferFunctionFlipMatcher } from "@better-typescript/matchers/builtins/preferFunctionFlip"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid lambdas that only flip the order of a curried application."

const hint =
  "Reorder the curried parameters so the fixed argument comes first " +
  "(data-last), then pass the partial f(y) directly — or use " +
  "Function.flip(f)(y) instead of (x) => f(x)(y)."

export const preferFunctionFlip = defineBuiltinPolicy(
  "prefer-function-flip",
  preferFunctionFlipMatcher,
  factGuidance(message, hint)
)
