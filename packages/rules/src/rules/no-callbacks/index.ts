import { noCallbacksScanner } from "./noCallbacks.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const noCallbacksMessage = "Avoid callback-style void APIs."

const noCallbacksHint = "Return an Effect from the operation instead of accepting a callback."

export const noCallbacks = makeRule("no-callbacks")(noCallbacksScanner)(
  fixedRuleMessage(noCallbacksMessage, noCallbacksHint)
)
