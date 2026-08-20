import { noBlankLinesBetweenSingleLineDeclarationsScanner } from "./noBlankLinesBetweenSingleLineDeclarations.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoBlankLinesBetweenSingleLineDeclarations = () => {
  const message = "Single-line declarations must not have blank lines between them."

  const hint =
    "Remove the empty line between these adjacent single-line declarations so they " +
    "stay contiguous. Blank lines remain required around multi-line declarations; " +
    "keep those separators when a neighbor is multi-line."

  const noBlankLinesBetweenSingleLineDeclarations = makeRule(
    "no-blank-lines-between-single-line-declarations"
  )(noBlankLinesBetweenSingleLineDeclarationsScanner)(fixedRuleMessage(message, hint))

  return noBlankLinesBetweenSingleLineDeclarations
}

export const noBlankLinesBetweenSingleLineDeclarations =
  makeNoBlankLinesBetweenSingleLineDeclarations()
