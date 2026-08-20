import { noSwitchStatementsScanner } from "./noSwitchStatements.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const noSwitchStatementsMessage = "Avoid switch statements."

const noSwitchStatementsHint =
  "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
  "so every case is handled explicitly."

export const noSwitchStatements = makeRule("no-switch-statements")(noSwitchStatementsScanner)(
  fixedRuleMessage(noSwitchStatementsMessage, noSwitchStatementsHint)
)
