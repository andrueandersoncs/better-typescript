import { preferEffectFunctionConstantScanner } from "./preferEffectFunctionConstant.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferEffectFunctionConstant = () => {
  const message = "Avoid a handwritten constant thunk."

  const makePreferEffectFunctionConstantRuleMessage: RuleMessage<
    typeof preferEffectFunctionConstantScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof preferEffectFunctionConstantScanner extends Scanner<infer Fact> ? Fact : never
      >
    ) => {
      const { expressionText } = match.fact

      return makeRuleMessage(
        message,
        `Use Function.constant(${expressionText}) from Effect when a zero-argument function only returns a stable value. ` +
          "Function.constant captures that value once and returns a zero-argument function."
      )
    }

  const preferEffectFunctionConstant = makeRule("prefer-effect-function-constant")(
    preferEffectFunctionConstantScanner
  )(makePreferEffectFunctionConstantRuleMessage)

  return preferEffectFunctionConstant
}

export const preferEffectFunctionConstant = makePreferEffectFunctionConstant()
