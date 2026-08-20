import { preferEffectSchemaIsScanner } from "./preferEffectSchemaIs.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferEffectSchemaIs = () => {
  const makePreferEffectSchemaIsRuleMessage: RuleMessage<
    typeof preferEffectSchemaIsScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<typeof preferEffectSchemaIsScanner extends Scanner<infer Fact> ? Fact : never>
    ) => {
      const { valueText, operatorText, tagText, isNegated } = match.fact
      const schemaIsCheck = `Schema.is($schema)(${valueText})`
      const suggestion = isNegated ? `!${schemaIsCheck}` : schemaIsCheck

      return makeRuleMessage(
        `Avoid checking ${valueText}._tag ${operatorText} "${tagText}" directly.`,
        `Replace the tag check with ${suggestion}, using the Effect Schema class for "${tagText}".`
      )
    }

  const preferEffectSchemaIs = makeRule("prefer-effect-schema-is")(preferEffectSchemaIsScanner)(
    makePreferEffectSchemaIsRuleMessage
  )

  return preferEffectSchemaIs
}

export const preferEffectSchemaIs = makePreferEffectSchemaIs()
