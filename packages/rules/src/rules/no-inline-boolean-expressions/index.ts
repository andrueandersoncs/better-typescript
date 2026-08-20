import { noInlineBooleanExpressionsScanner } from "./noInlineBooleanExpressions.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoInlineBooleanExpressions = () => {
  const message = "Avoid boolean operators inline in an if statement condition."

  const hint =
    "Extract the expression into a well-named const variable declaration above the if " +
    "statement and use that variable in the if condition."

  const noInlineBooleanExpressions = makeRule("no-inline-boolean-expressions")(
    noInlineBooleanExpressionsScanner
  )(fixedRuleMessage(message, hint))

  return noInlineBooleanExpressions
}

export const noInlineBooleanExpressions = makeNoInlineBooleanExpressions()
