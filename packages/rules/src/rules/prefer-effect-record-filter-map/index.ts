import { preferEffectRecordFilterMapScanner } from "./preferEffectRecordFilterMap.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferEffectRecordFilterMap = () => {
  const message = "Avoid conditional object spreads."

  const hint =
    "Build a record of candidate properties and use Record.filterMap from Effect with " +
    "Result.succeed/Result.fail (or Result.fromNullishOr) to keep only present entries."

  const preferEffectRecordFilterMap = makeRule("prefer-effect-record-filter-map")(
    preferEffectRecordFilterMapScanner
  )(fixedRuleMessage(message, hint))

  return preferEffectRecordFilterMap
}

export const preferEffectRecordFilterMap = makePreferEffectRecordFilterMap()
