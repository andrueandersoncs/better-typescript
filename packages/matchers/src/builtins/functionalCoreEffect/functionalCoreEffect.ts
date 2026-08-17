import { Array, pipe } from "effect"
import type { Subscription } from "../../matcher/subscription.js"
import { FunctionalCoreBoundaryData } from "./boundaryData.js"
import { dependencyCapabilityFeature } from "./dependencyCapabilityFeature.js"
import { effectRuntimeProvisioningFeature } from "./effectRuntimeProvisioningFeature.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"
import { withFunctionalCoreEffectIndex } from "./functionalCoreEffectIndexBuild.js"
import { importTypeResolutionFeature } from "./importTypeResolutionFeature.js"
import { orchestrationShapeFeature } from "./orchestrationShapeFeature.js"
import { portAdapterResourceLifetimeFeature } from "./portAdapterResourceLifetimeFeature.js"

const makeFunctionalCoreEffectInterface = () => {
  const functionalCoreEffectFeatures = Array.make(
    dependencyCapabilityFeature,
    effectRuntimeProvisioningFeature,
    portAdapterResourceLifetimeFeature,
    importTypeResolutionFeature,
    orchestrationShapeFeature
  )

  type FunctionalCoreEffectFeature = (typeof functionalCoreEffectFeatures)[number]

  const boundaryFactsFor =
    (index: FunctionalCoreEffectIndex) =>
    (
      feature: FunctionalCoreEffectFeature
    ): ReadonlyArray<Subscription<FunctionalCoreBoundaryData>> =>
      feature.boundaryFacts(index)

  const boundaryFacts = (index: FunctionalCoreEffectIndex) =>
    pipe(functionalCoreEffectFeatures, Array.flatMap(boundaryFactsFor(index)))

  return withFunctionalCoreEffectIndex(boundaryFacts)
}

export const makeFunctionalCoreEffect = makeFunctionalCoreEffectInterface()
