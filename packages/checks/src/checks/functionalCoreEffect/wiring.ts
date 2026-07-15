import { Array } from "effect"
import { makeWiring, namedCheck, silentCheck } from "@better-typescript/core/engine/report"
import type { Wiring } from "@better-typescript/core/engine/report/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { functionalCoreEffectDerive } from "./advice.js"
import { makeFunctionalCoreEffect } from "./functionalCoreEffect.js"
import { functionalCoreBoundaryCheckName, functionalCoreShapeCheckName } from "./names.js"
import { defaultFunctionalCoreEffectPolicy, type FunctionalCoreEffectPolicy } from "./policy.js"
import { makeFunctionalCoreShapeEvidence } from "./shapeEvidence.js"

const boundaryExamples = fixtureRefactorExamples("functional-core-effect-boundaries")

export const makeFunctionalCoreEffectWiring = (policy: FunctionalCoreEffectPolicy): Wiring => {
  const boundaryPlan = makeFunctionalCoreEffect(policy)

  const boundaryCheck = namedCheck(functionalCoreBoundaryCheckName, boundaryPlan, boundaryExamples)

  const shapeEvidence = makeFunctionalCoreShapeEvidence(policy)
  const shapeCheck = silentCheck(functionalCoreShapeCheckName, shapeEvidence)
  const checks = Array.make(boundaryCheck, shapeCheck)

  return makeWiring({
    checks,
    derive: functionalCoreEffectDerive
  })
}

export const functionalCoreEffectWiring: Wiring = makeFunctionalCoreEffectWiring(
  defaultFunctionalCoreEffectPolicy
)
