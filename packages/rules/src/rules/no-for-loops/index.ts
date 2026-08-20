import { noForLoopsScanner } from "./noForLoops.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const noForLoopsMessage = "Avoid imperative logic in iterator-based for loops."

const noForLoopsHint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."

export const noForLoops = makeRule("no-for-loops")(noForLoopsScanner)(
  fixedRuleMessage(noForLoopsMessage, noForLoopsHint)
)
