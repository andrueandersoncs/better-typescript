import { noInlineBooleanExpressionsMatcher } from "@better-typescript/matchers/builtins/noInlineBooleanExpressions"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid boolean operators inline in an if statement condition."

const hint =
  "Extract the expression into a well-named const variable declaration above the if " +
  "statement and use that variable in the if condition."

export const noInlineBooleanExpressions = defineBuiltinPolicy(
  "no-inline-boolean-expressions",
  noInlineBooleanExpressionsMatcher,
  factGuidance(message, hint)
)
