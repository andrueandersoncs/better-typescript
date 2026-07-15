import { Array } from "effect"
import { makeWiring, namedCheck, silentCheck } from "@better-typescript/core/engine/report"
import type { NamedCheck, Wiring } from "@better-typescript/core/engine/report/data"
import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { functionalCoreEffectDerive } from "../checks/functionalCoreEffect/advice.js"
import { makeFunctionalCoreEffect } from "../checks/functionalCoreEffect/functionalCoreEffect.js"
import {
  functionalCoreBoundaryCheckName,
  functionalCoreShapeCheckName
} from "../checks/functionalCoreEffect/names.js"
import {
  defaultFunctionalCoreEffectPolicy,
  type FunctionalCoreEffectPolicy
} from "../checks/functionalCoreEffect/policy.js"
import { makeFunctionalCoreShapeEvidence } from "../checks/functionalCoreEffect/shapeEvidence.js"

const boundaryExamples = fixtureRefactorExamples("functional-core-effect-boundaries")

export const makeFunctionalCoreEffectChecks = (
  policy: FunctionalCoreEffectPolicy
): ReadonlyArray<NamedCheck> =>
  Array.make(
    namedCheck(functionalCoreBoundaryCheckName, makeFunctionalCoreEffect(policy), boundaryExamples),
    silentCheck(functionalCoreShapeCheckName, makeFunctionalCoreShapeEvidence(policy))
  )

export const makeFunctionalCoreEffectWiring = (policy: FunctionalCoreEffectPolicy): Wiring =>
  makeWiring({
    checks: makeFunctionalCoreEffectChecks(policy),
    derive: functionalCoreEffectDerive
  })

export const functionalCoreEffectWiring: Wiring = makeFunctionalCoreEffectWiring(
  defaultFunctionalCoreEffectPolicy
)
