import { noExportAliasesMatcher } from "@better-typescript/matchers/builtins/noExportAliases"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Do not implement export aliases."

const hint = "Name functions appropriately from the start; don't implement export aliases."

export const noExportAliases = makeBuiltinPolicy(
  "no-export-aliases",
  noExportAliasesMatcher,
  factGuidance(message, hint)
)
