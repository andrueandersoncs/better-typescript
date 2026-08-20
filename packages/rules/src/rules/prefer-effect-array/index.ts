import { preferEffectArrayScanner } from "./preferEffectArray.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferEffectArray = () => {
  const hint =
    "Prefer Effect's Array module — define the array as a const and call " +
    "Array.every(values, Boolean), Array.map(values, f), Array.filter(values, f), " +
    "or the matching Array.* helper — instead of invoking Array.prototype methods " +
    "directly on array values."

  const makePreferEffectArrayRuleMessage: RuleMessage<
    typeof preferEffectArrayScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (match: Match<typeof preferEffectArrayScanner extends Scanner<infer Fact> ? Fact : never>) =>
      makeRuleMessage(`Avoid Array.prototype.${match.fact.method}().`, hint)

  const preferEffectArray = makeRule("prefer-effect-array")(preferEffectArrayScanner)(
    makePreferEffectArrayRuleMessage
  )

  return preferEffectArray
}

export const preferEffectArray = makePreferEffectArray()
