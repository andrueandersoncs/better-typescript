import { noForInLoopsScanner } from "./noForInLoops.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const noForInLoopsMessage = "Avoid imperative logic in for..in loops."

const noForInLoopsHint =
  "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
  "or Record.toEntries(), instead."

export const noForInLoops = makeRule("no-for-in-loops")(noForInLoopsScanner)(
  fixedRuleMessage(noForInLoopsMessage, noForInLoopsHint)
)
