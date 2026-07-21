import { makeFindings } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferEffectSchemaGuardMatcher,
  type PreferEffectSchemaGuardFact
} from "@better-typescript/matchers/builtins/preferEffectSchemaGuard"
import { makeBuiltinPolicy } from "../definePolicy.js"

const preferEffectSchemaGuardGuidance: Guidance<PreferEffectSchemaGuardFact> = () => (match) => {
  const { propertyName, objectText } = match.fact

  return makeFindings(
    match.target,
    `Avoid using ${propertyName} in ${objectText} as a type guard.`,
    `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${objectText}).`,
    match.fact
  )
}

export const preferEffectSchemaGuard = makeBuiltinPolicy(
  "prefer-effect-schema-guard",
  preferEffectSchemaGuardMatcher,
  preferEffectSchemaGuardGuidance
)
