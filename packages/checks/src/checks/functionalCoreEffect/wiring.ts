import { Array, Effect } from "effect"
import { makeWiring, namedCheck, silentCheck } from "@better-typescript/core/engine/wiring"
import { packageExamples } from "../../defineCheck.js"
import { functionalCoreEffectDerive } from "./advice.js"
import { makeFunctionalCoreEffect } from "./functionalCoreEffect.js"
import { functionalCoreBoundaryCheckName, functionalCoreShapeCheckName } from "./names.js"
import { defaultFunctionalCoreEffectPolicy, type FunctionalCoreEffectPolicy } from "./policy.js"
import { makeFunctionalCoreShapeEvidence } from "./shapeEvidence.js"

export const makeFunctionalCoreEffectWiring = Effect.fn("makeFunctionalCoreEffectWiring")(
  function* (policy: FunctionalCoreEffectPolicy) {
    const boundaryExamplesEffect = packageExamples("functional-core-effect-boundaries")

    const { boundaryExamples, derive } = yield* Effect.all({
      boundaryExamples: boundaryExamplesEffect,
      derive: functionalCoreEffectDerive
    })

    const boundaryPlan = makeFunctionalCoreEffect(policy)

    const boundaryCheck = namedCheck(
      functionalCoreBoundaryCheckName,
      boundaryPlan,
      boundaryExamples
    )

    const shapeEvidence = makeFunctionalCoreShapeEvidence(policy)
    const shapeCheck = silentCheck(functionalCoreShapeCheckName, shapeEvidence)
    const checks = Array.make(boundaryCheck, shapeCheck)

    return makeWiring({ checks, derive })
  }
)

export const functionalCoreEffectWiring = makeFunctionalCoreEffectWiring(
  defaultFunctionalCoreEffectPolicy
)
