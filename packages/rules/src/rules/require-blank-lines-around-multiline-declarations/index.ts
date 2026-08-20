import { requireBlankLinesAroundMultilineDeclarationsScanner } from "./requireBlankLinesAroundMultilineDeclarations.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeRequireBlankLinesAroundMultilineDeclarations = () => {
  const message = "Multi-line declarations must have a blank line above and below."

  const hint =
    "Insert an empty line before and after this declaration so its multi-line shape " +
    "is visually separated from neighboring statements. Single-line declarations do " +
    "not need surrounding blank lines; the first and last statements in a block are " +
    "exempt on the outer sides."

  const requireBlankLinesAroundMultilineDeclarations = makeRule(
    "require-blank-lines-around-multiline-declarations"
  )(requireBlankLinesAroundMultilineDeclarationsScanner)(fixedRuleMessage(message, hint))

  return requireBlankLinesAroundMultilineDeclarations
}

export const requireBlankLinesAroundMultilineDeclarations =
  makeRequireBlankLinesAroundMultilineDeclarations()
