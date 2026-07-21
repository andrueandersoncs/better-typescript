import { noNestedIfStatementsMatcher } from "@better-typescript/matchers/builtins/noNestedIfStatements"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid nesting if statements."

const hint =
  "Combine related conditions with boolean operators, or use an early return so this " +
  "condition can remain a single-level if statement."

export const noNestedIfStatements = defineBuiltinPolicy(
  "no-nested-if-statements",
  noNestedIfStatementsMatcher,
  factGuidance(message, hint)
)
