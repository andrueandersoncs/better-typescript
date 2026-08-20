import { noMultipleBooleanOperatorsScanner } from "./noMultipleBooleanOperators.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoMultipleBooleanOperators = () => {
  const message = "Avoid combining more than one boolean operator in a single expression."

  const hint =
    "Declare multiple constant variables instead of combining operators into a " +
    "single expression."

  const noMultipleBooleanOperators = makeRule("no-multiple-boolean-operators")(
    noMultipleBooleanOperatorsScanner
  )(fixedRuleMessage(message, hint))

  return noMultipleBooleanOperators
}

export const noMultipleBooleanOperators = makeNoMultipleBooleanOperators()
