import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import { makeEffectQualityEvidenceMatcher } from "@better-typescript/matchers/builtins/effectQuality/effectQualityEvidence"
import { EffectQualityAdviceData } from "@better-typescript/matchers/builtins/effectQuality/data"
import {
  defaultEffectQualityPolicy,
  type EffectQualityPolicy
} from "@better-typescript/matchers/builtins/effectQuality/policy"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"

// Silent evidence carries kind/subject only because derive owns user-facing advice prose.
const makeEffectQualityAdviceEvidenceFindings = (match: Match<EffectQualityAdviceData>) =>
  makeFindings(match.target, match.fact.kind, match.fact.subject, match.fact)

export const makeEffectQualityAdviceEvidence = (policy: EffectQualityPolicy) => {
  const matcher = makeEffectQualityEvidenceMatcher(policy)

  return makeSilentBuiltinPolicy(
    "effect-quality-advice-evidence",
    matcher,
    Function.constant(makeEffectQualityAdviceEvidenceFindings)
  )
}

export const effectQualityAdviceEvidence = makeEffectQualityAdviceEvidence(
  defaultEffectQualityPolicy
)
