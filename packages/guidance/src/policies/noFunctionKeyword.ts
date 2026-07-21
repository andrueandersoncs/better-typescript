import { noFunctionKeywordMatcher } from "@better-typescript/matchers/builtins/noFunctionKeyword"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid using the function keyword."

const hint =
  "Declare this function as a const using fat-arrow syntax instead. Keep function " +
  "declarations only when overload signatures are required, and keep function* when " +
  "generator semantics are required."

export const noFunctionKeyword = defineBuiltinPolicy(
  "no-function-keyword",
  noFunctionKeywordMatcher,
  factGuidance(message, hint)
)
