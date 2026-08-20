import { preferEffectArrayCountByScanner } from "./preferEffectArrayCountBy.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferEffectArrayCountBy = () => {
  const message = "Avoid filtering an array only to count matching elements."

  const hint =
    "Replace Array.filter(values, predicate).length with Array.countBy(values, predicate) from " +
    "Effect. Remove a surrounding helper when that is its only behavior."

  const preferEffectArrayCountBy = makeRule("prefer-effect-array-count-by")(
    preferEffectArrayCountByScanner
  )(fixedRuleMessage(message, hint))

  return preferEffectArrayCountBy
}

export const preferEffectArrayCountBy = makePreferEffectArrayCountBy()
