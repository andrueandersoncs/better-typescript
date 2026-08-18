import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/match"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { makeFunctionalCoreShapeEvidence } from "@better-typescript/matchers/builtins/functionalCoreEffect/shapeEvidence"
import { FunctionalCoreShapeData } from "@better-typescript/matchers/builtins/functionalCoreEffect/shapeData"
import { defaultFunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyDefaults"
import type { FunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffectPolicyClass"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"

const message = "Functional-core architecture shape evidence for derived advice."

const hint = "Use this silent signal only as input to functional-core advice derivation."

const makeFunctionalCoreShapeEvidenceFindings = (match: Match<FunctionalCoreShapeData>) =>
  makeFindings(match.target, message, hint, match.fact)

export const makeFunctionalCoreShapeEvidencePolicy = (policy: FunctionalCoreEffectPolicy) => {
  const matcher = makeFunctionalCoreShapeEvidence(policy)

  return makeBuiltinPolicy({
    name: "functional-core-effect-shape-evidence",
    matcher: matcher,
    guidance: Function.constant(makeFunctionalCoreShapeEvidenceFindings),
    reported: false,
    stage: "program"
  })
}

export const functionalCoreShapeEvidence = makeFunctionalCoreShapeEvidencePolicy(
  defaultFunctionalCoreEffectPolicy
)
