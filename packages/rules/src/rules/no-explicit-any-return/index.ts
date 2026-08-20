import { noExplicitAnyReturnScanner } from "./noExplicitAnyReturn.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoExplicitAnyReturn = () => {
  const message = "Avoid function return types that include any."

  const hint =
    "Declare a precise return type instead of any. If the value is unknown at a boundary, " +
    "use unknown and narrow before use."

  const noExplicitAnyReturn = makeRule("no-explicit-any-return")(noExplicitAnyReturnScanner)(
    fixedRuleMessage(message, hint)
  )

  return noExplicitAnyReturn
}

export const noExplicitAnyReturn = makeNoExplicitAnyReturn()
