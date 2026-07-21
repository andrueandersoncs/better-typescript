import { importUsage as importUsageMatcher } from "@better-typescript/matchers/builtins/importUsage"
import { defineSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Import usage evidence — this import declaration binds names used in the file."

const hint =
  "Counts are purely syntactic within the importing file; local shadowing of an import binding can inflate or hide references."

export const importUsage = defineSilentBuiltinPolicy(
  "import-usage",
  importUsageMatcher,
  factGuidance(message, hint)
)
