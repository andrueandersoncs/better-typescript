import { preferEffectPropertyAccessorsScanner } from "./preferEffectPropertyAccessors.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferEffectPropertyAccessors = () => {
  const makePreferEffectPropertyAccessorsRuleMessage: RuleMessage<
    typeof preferEffectPropertyAccessorsScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof preferEffectPropertyAccessorsScanner extends Scanner<infer Fact> ? Fact : never
      >
    ) => {
      const { name, accessedText, moduleName, propertyKey } = match.fact
      const suggestion = `${moduleName}.get(${propertyKey})`

      return makeRuleMessage(
        `Avoid defining ${name} only to read ${accessedText}.`,
        `Replace this property-access-only function with ${suggestion} from Effect. ` +
          "Use Struct.get for non-record data types, and Record.get or Record.has for records."
      )
    }

  const preferEffectPropertyAccessors = makeRule("prefer-effect-property-accessors")(
    preferEffectPropertyAccessorsScanner
  )(makePreferEffectPropertyAccessorsRuleMessage)

  return preferEffectPropertyAccessors
}

export const preferEffectPropertyAccessors = makePreferEffectPropertyAccessors()
