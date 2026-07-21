import { Array } from "effect"
import { makeWiring } from "@better-typescript/core/engine/wiring"
import {
  defaultEffectQualityPolicy,
  type EffectQualityPolicy
} from "@better-typescript/matchers/builtins/effectQuality/policy"
import { effectQualityDerive } from "../effectQuality/advice.js"
import { makeEffectQualityRules } from "../policies/effectQualityRules.js"
import { makeEffectQualityAdviceEvidence } from "../policies/effectQualityAdviceEvidence.js"

export const makeEffectQualityWiring = (policy: EffectQualityPolicy) => {
  const rules = makeEffectQualityRules(policy)
  const adviceEvidence = makeEffectQualityAdviceEvidence(policy)
  const policies = Array.make(rules, adviceEvidence)

  return makeWiring({
    policies,
    derive: effectQualityDerive
  })
}

export const effectQualityWiring = makeEffectQualityWiring(defaultEffectQualityPolicy)
