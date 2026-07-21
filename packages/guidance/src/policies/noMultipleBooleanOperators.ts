import { noMultipleBooleanOperatorsMatcher } from "@better-typescript/matchers/builtins/noMultipleBooleanOperators"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid combining more than one boolean operator in a single expression."

const hint =
  "Declare multiple constant variables instead of combining operators into a " +
  "single expression."

export const noMultipleBooleanOperators = defineBuiltinPolicy(
  "no-multiple-boolean-operators",
  noMultipleBooleanOperatorsMatcher,
  factGuidance(message, hint)
)
