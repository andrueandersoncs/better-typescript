import { preferEffectSchemaGuardScanner } from "./preferEffectSchemaGuard.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferEffectSchemaGuard = () => {
  const makePreferEffectSchemaGuardRuleMessage: RuleMessage<
    typeof preferEffectSchemaGuardScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<typeof preferEffectSchemaGuardScanner extends Scanner<infer Fact> ? Fact : never>
    ) => {
      const { propertyName, objectText } = match.fact

      return makeRuleMessage(
        `Avoid using ${propertyName} in ${objectText} as a type guard.`,
        `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${objectText}).`
      )
    }

  const preferEffectSchemaGuard = makeRule("prefer-effect-schema-guard")(
    preferEffectSchemaGuardScanner
  )(makePreferEffectSchemaGuardRuleMessage)

  return preferEffectSchemaGuard
}

export const preferEffectSchemaGuard = makePreferEffectSchemaGuard()
