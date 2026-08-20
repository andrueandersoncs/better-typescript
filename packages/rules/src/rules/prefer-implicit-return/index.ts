import { preferImplicitReturnScanner } from "./preferImplicitReturn.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferImplicitReturn = () => {
  const message = "Avoid arrow function block bodies that only return a value."

  const hint =
    "Replace this with an implicit return by removing the return statement and function " +
    "body braces. Wrap object literals in parentheses when needed."

  const preferImplicitReturn = makeRule("prefer-implicit-return")(preferImplicitReturnScanner)(
    fixedRuleMessage(message, hint)
  )

  return preferImplicitReturn
}

export const preferImplicitReturn = makePreferImplicitReturn()
