import { preferConditionalReturnScanner } from "./preferConditionalReturn.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferConditionalReturn = () => {
  const makePreferConditionalReturnRuleMessage: RuleMessage<
    typeof preferConditionalReturnScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<typeof preferConditionalReturnScanner extends Scanner<infer Fact> ? Fact : never>
    ) =>
      makeRuleMessage(
        "Avoid if statements that only choose between two return values.",
        `Return a conditional expression instead: return ${match.fact.returnText}.`
      )

  const preferConditionalReturn = makeRule("prefer-conditional-return")(
    preferConditionalReturnScanner
  )(makePreferConditionalReturnRuleMessage)

  return preferConditionalReturn
}

export const preferConditionalReturn = makePreferConditionalReturn()
