import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import { makeEffectQualityEvidenceMatcher } from "@better-typescript/matchers/builtins/effectQuality/effectQualityEvidence"
import { EffectQualityAdviceData } from "@better-typescript/matchers/builtins/effectQuality/data"
import {
  defaultEffectQualityPolicy,
  type EffectQualityPolicy
} from "@better-typescript/matchers/builtins/effectQuality/policy"
import { defineSilentBuiltinPolicy } from "../definePolicy.js"

// Silent evidence carries kind/subject only because derive owns user-facing advice prose.
const effectQualityAdviceEvidenceFindings = (match: Match<EffectQualityAdviceData>) =>
  oneFinding(match.target, match.fact.kind, match.fact.subject, match.fact)

export const makeEffectQualityAdviceEvidence = (policy: EffectQualityPolicy) => {
  const matcher = makeEffectQualityEvidenceMatcher(policy)

  return defineSilentBuiltinPolicy(
    "effect-quality-advice-evidence",
    matcher,
    Function.constant(effectQualityAdviceEvidenceFindings)
  )
}

export const effectQualityAdviceEvidence = makeEffectQualityAdviceEvidence(
  defaultEffectQualityPolicy
)
