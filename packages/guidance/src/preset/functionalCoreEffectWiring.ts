import { Array } from "effect"
import { makeWiring } from "@better-typescript/core/engine/wiring"
import {
  defaultFunctionalCoreEffectPolicy,
  type FunctionalCoreEffectPolicy
} from "@better-typescript/matchers/builtins/functionalCoreEffect/policy"
import { functionalCoreEffectDerive } from "../functionalCoreEffect/advice.js"
import { makeFunctionalCoreEffectBoundaries } from "../policies/functionalCoreEffectBoundaries.js"
import { makeFunctionalCoreShapeEvidencePolicy } from "../policies/functionalCoreShapeEvidence.js"

export const makeFunctionalCoreEffectWiring = (policy: FunctionalCoreEffectPolicy) => {
  const boundaries = makeFunctionalCoreEffectBoundaries(policy)
  const shapeEvidence = makeFunctionalCoreShapeEvidencePolicy(policy)
  const policies = Array.make(boundaries, shapeEvidence)

  return makeWiring({
    policies,
    derive: functionalCoreEffectDerive
  })
}

export const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(
  defaultFunctionalCoreEffectPolicy
)
