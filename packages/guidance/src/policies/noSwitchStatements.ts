import { noSwitchStatementsMatcher } from "@better-typescript/matchers/builtins/noSwitchStatements"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid switch statements."

const hint =
  "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
  "so every case is handled explicitly."

export const noSwitchStatements = defineBuiltinPolicy(
  "no-switch-statements",
  noSwitchStatementsMatcher,
  factGuidance(message, hint)
)
