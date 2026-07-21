import { noBlankLinesBetweenSingleLineDeclarationsMatcher } from "@better-typescript/matchers/builtins/noBlankLinesBetweenSingleLineDeclarations"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Single-line declarations must not have blank lines between them."

const hint =
  "Remove the empty line between these adjacent single-line declarations so they " +
  "stay contiguous. Blank lines remain required around multi-line declarations; " +
  "keep those separators when a neighbor is multi-line."

export const noBlankLinesBetweenSingleLineDeclarations = makeBuiltinPolicy(
  "no-blank-lines-between-single-line-declarations",
  noBlankLinesBetweenSingleLineDeclarationsMatcher,
  factGuidance(message, hint)
)
