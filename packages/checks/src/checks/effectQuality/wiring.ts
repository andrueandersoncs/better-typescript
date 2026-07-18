import { Array } from "effect"
import { makeNamedCheck, makeSilentCheck, makeWiring } from "@better-typescript/core/engine/wiring"
import { packageExamples } from "../../defineCheck.js"
import { effectQualityDerive } from "./advice.js"
import { makeEffectQualityRules } from "./effectQuality.js"
import { makeEffectQualityEvidence } from "./effectQualityEvidence.js"
import { effectQualityAdviceCheckName, effectQualityRuleCheckName } from "./names.js"
import { defaultEffectQualityPolicy, type EffectQualityPolicy } from "./policy.js"

const ruleExamples = packageExamples("effect-quality")

export const makeEffectQualityWiring = (policy: EffectQualityPolicy) => {
  const rulesPlan = makeEffectQualityRules(policy)
  const rules = makeNamedCheck(effectQualityRuleCheckName, rulesPlan, ruleExamples)
  const evidencePlan = makeEffectQualityEvidence(policy)
  const evidence = makeSilentCheck(effectQualityAdviceCheckName, evidencePlan)
  const checks = Array.make(rules, evidence)

  return makeWiring({
    checks,
    derive: effectQualityDerive
  })
}

export const effectQualityWiring = makeEffectQualityWiring(defaultEffectQualityPolicy)
