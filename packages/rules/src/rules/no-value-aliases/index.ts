import { noValueAliasesScanner } from "./noValueAliases.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoValueAliases = () => {
  const message = "Do not declare aliases for existing values."

  const hint =
    "Use the referenced value directly. If it needs distinct semantics or one-time evaluation, " +
    "introduce behavior or constructed data instead of another name for the same value."

  const noValueAliases = makeRule("no-value-aliases")(noValueAliasesScanner)(
    fixedRuleMessage(message, hint)
  )

  return noValueAliases
}

export const noValueAliases = makeNoValueAliases()
