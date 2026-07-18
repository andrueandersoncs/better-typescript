import { Array } from "effect"
import { makeWiring, makeNamedCheck, makeSilentCheck } from "@better-typescript/core/engine/wiring"
import { Wiring } from "@better-typescript/core/engine/wiring/data"
import { packageExamples } from "../../defineCheck.js"
import { functionalCoreEffectDerive } from "./advice.js"
import { makeFunctionalCoreEffect } from "./functionalCoreEffect.js"
import { functionalCoreBoundaryCheckName, functionalCoreShapeCheckName } from "./names.js"
import { defaultFunctionalCoreEffectPolicy, type FunctionalCoreEffectPolicy } from "./policy.js"
import { makeFunctionalCoreShapeEvidence } from "./shapeEvidence.js"

const boundaryExamples = packageExamples("functional-core-effect-boundaries")

export const makeFunctionalCoreEffectWiring = (policy: FunctionalCoreEffectPolicy): Wiring => {
  const boundaryPlan = makeFunctionalCoreEffect(policy)

  const boundaryCheck = makeNamedCheck(
    functionalCoreBoundaryCheckName,
    boundaryPlan,
    boundaryExamples
  )

  const shapeEvidence = makeFunctionalCoreShapeEvidence(policy)
  const shapeCheck = makeSilentCheck(functionalCoreShapeCheckName, shapeEvidence)
  const checks = Array.make(boundaryCheck, shapeCheck)

  const wiring = new Wiring({
    checks,
    derive: functionalCoreEffectDerive
  })

  return makeWiring(wiring)
}

export const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(
  defaultFunctionalCoreEffectPolicy
)
