import { preferCurriedDataLastFunctionsScanner } from "./preferCurriedDataLastFunctions.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferCurriedDataLastFunctions = () => {
  const message = "Avoid rest parameters and multiple runtime parameters in one function."

  const hint =
    "Curry runtime parameters into unary functions so configuration comes first and the primary data value is supplied last."

  const preferCurriedDataLastFunctions = makeRule("prefer-curried-data-last-functions")(
    preferCurriedDataLastFunctionsScanner
  )(fixedRuleMessage(message, hint))

  return preferCurriedDataLastFunctions
}

export const preferCurriedDataLastFunctions = makePreferCurriedDataLastFunctions()
