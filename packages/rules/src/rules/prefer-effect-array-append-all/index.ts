import { preferEffectArrayAppendAllScanner } from "./preferEffectArrayAppendAll.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferEffectArrayAppendAll = () => {
  const message = "Avoid conditional array spreads."

  const hint =
    "Use Array.appendAll from Effect to combine arrays instead of spreading a conditional " +
    "expression that chooses between an array and an empty array literal."

  const preferEffectArrayAppendAll = makeRule("prefer-effect-array-append-all")(
    preferEffectArrayAppendAllScanner
  )(fixedRuleMessage(message, hint))

  return preferEffectArrayAppendAll
}

export const preferEffectArrayAppendAll = makePreferEffectArrayAppendAll()
