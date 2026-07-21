import { noUnusedMatcher } from "@better-typescript/matchers/builtins/noUnused"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid unused imports, declarations, and parameters."

const hint =
  "Delete the unused import, variable, function, type, or parameter. " +
  "If a parameter is required by a signature but intentionally unused, prefix its name with an underscore."

export const noUnused = defineBuiltinPolicy(
  "no-unused",
  noUnusedMatcher,
  factGuidance(message, hint)
)
