import { preferPipeFunctionMatcher } from "@better-typescript/matchers/builtins/preferPipeFunction"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid calling .pipe() as a method."

const hint =
  'Import pipe from "effect" and call it as a standalone function: ' +
  "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."

export const preferPipeFunction = defineBuiltinPolicy(
  "prefer-pipe-function",
  preferPipeFunctionMatcher,
  factGuidance(message, hint)
)
