import { noValueAliasesMatcher } from "@better-typescript/matchers/builtins/noValueAliases"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Do not declare aliases for existing values."

const hint =
  "Use the referenced value directly. If it needs distinct semantics or one-time evaluation, " +
  "introduce behavior or constructed data instead of another name for the same value."

export const noValueAliases = makeBuiltinPolicy(
  "no-value-aliases",
  noValueAliasesMatcher,
  factGuidance(message, hint)
)
