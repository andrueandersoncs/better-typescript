import { makeFindings } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferEffectSchemaIsMatcher,
  type PreferEffectSchemaIsFact
} from "@better-typescript/matchers/builtins/preferEffectSchemaIs"
import { makeBuiltinPolicy } from "../definePolicy.js"

const preferEffectSchemaIsGuidance: Guidance<PreferEffectSchemaIsFact> = () => (match) => {
  const { valueText, operatorText, tagText, isNegated } = match.fact
  const schemaIsCheck = `Schema.is($schema)(${valueText})`
  const suggestion = isNegated ? `!${schemaIsCheck}` : schemaIsCheck

  return makeFindings(
    match.target,
    `Avoid checking ${valueText}._tag ${operatorText} "${tagText}" directly.`,
    `Replace the tag check with ${suggestion}, using the Effect Schema class for "${tagText}".`,
    match.fact
  )
}

export const preferEffectSchemaIs = makeBuiltinPolicy(
  "prefer-effect-schema-is",
  preferEffectSchemaIsMatcher,
  preferEffectSchemaIsGuidance
)
