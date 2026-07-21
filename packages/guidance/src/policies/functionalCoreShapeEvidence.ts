import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import { makeFunctionalCoreShapeEvidence } from "@better-typescript/matchers/builtins/functionalCoreEffect/shapeEvidence"
import { FunctionalCoreShapeData } from "@better-typescript/matchers/builtins/functionalCoreEffect/data"
import {
  defaultFunctionalCoreEffectPolicy,
  type FunctionalCoreEffectPolicy
} from "@better-typescript/matchers/builtins/functionalCoreEffect/policy"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"

const message = "Functional-core architecture shape evidence for derived advice."

const hint = "Use this silent signal only as input to functional-core advice derivation."

const makeFunctionalCoreShapeEvidenceFindings = (match: Match<FunctionalCoreShapeData>) =>
  makeFindings(match.target, message, hint, match.fact)

export const makeFunctionalCoreShapeEvidencePolicy = (policy: FunctionalCoreEffectPolicy) => {
  const matcher = makeFunctionalCoreShapeEvidence(policy)

  return makeSilentBuiltinPolicy(
    "functional-core-effect-shape-evidence",
    matcher,
    Function.constant(makeFunctionalCoreShapeEvidenceFindings)
  )
}

export const functionalCoreShapeEvidence = makeFunctionalCoreShapeEvidencePolicy(
  defaultFunctionalCoreEffectPolicy
)
