import { requireBlankLinesAroundMultilineDeclarationsMatcher } from "@better-typescript/matchers/builtins/requireBlankLinesAroundMultilineDeclarations"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Multi-line declarations must have a blank line above and below."

const hint =
  "Insert an empty line before and after this declaration so its multi-line shape " +
  "is visually separated from neighboring statements. Single-line declarations do " +
  "not need surrounding blank lines; the first and last statements in a block are " +
  "exempt on the outer sides."

export const requireBlankLinesAroundMultilineDeclarations = defineBuiltinPolicy(
  "require-blank-lines-around-multiline-declarations",
  requireBlankLinesAroundMultilineDeclarationsMatcher,
  factGuidance(message, hint)
)
