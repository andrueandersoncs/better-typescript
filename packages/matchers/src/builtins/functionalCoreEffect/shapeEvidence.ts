import { Array, pipe } from "effect"
import type { Subscription } from "../../matcher/subscription.js"
import { dependencyCapabilityFeature } from "./dependencyCapabilityFeature.js"
import { effectRuntimeProvisioningFeature } from "./effectRuntimeProvisioningFeature.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"
import { withFunctionalCoreEffectIndex } from "./functionalCoreEffectIndexBuild.js"
import { importTypeResolutionFeature } from "./importTypeResolutionFeature.js"
import { orchestrationShapeFeature } from "./orchestrationShapeFeature.js"
import { portAdapterResourceLifetimeFeature } from "./portAdapterResourceLifetimeFeature.js"
import type { FunctionalCoreShapeData } from "./shapeData.js"

const makeFunctionalCoreShapeEvidenceInterface = () => {
  const functionalCoreEffectFeatures = Array.make(
    dependencyCapabilityFeature,
    effectRuntimeProvisioningFeature,
    portAdapterResourceLifetimeFeature,
    importTypeResolutionFeature,
    orchestrationShapeFeature
  )

  type FunctionalCoreEffectFeature = (typeof functionalCoreEffectFeatures)[number]

  const shapeFactsFor =
    (index: FunctionalCoreEffectIndex) =>
    (feature: FunctionalCoreEffectFeature): ReadonlyArray<Subscription<FunctionalCoreShapeData>> =>
      feature.shapeFacts(index)

  const shapeFacts = (index: FunctionalCoreEffectIndex) =>
    pipe(functionalCoreEffectFeatures, Array.flatMap(shapeFactsFor(index)))

  return withFunctionalCoreEffectIndex(shapeFacts)
}

export const makeFunctionalCoreShapeEvidence = makeFunctionalCoreShapeEvidenceInterface()
