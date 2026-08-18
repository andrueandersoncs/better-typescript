import { Array, pipe } from "effect"
import type { Subscription } from "../../matcher/subscription.js"
import type { FunctionalCoreBoundaryData } from "./boundaryData.js"
import { dependencyCapabilityFeature } from "./dependencyCapabilityFeature.js"
import { effectRuntimeProvisioningFeature } from "./effectRuntimeProvisioningFeature.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"
import { importTypeResolutionFeature } from "./importTypeResolutionFeature.js"
import { orchestrationShapeFeature } from "./orchestrationShapeFeature.js"
import { portAdapterResourceLifetimeFeature } from "./portAdapterResourceLifetimeFeature.js"
import type { FunctionalCoreShapeData } from "./shapeData.js"

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
  (feature: FunctionalCoreEffectFeature): ReadonlyArray<Subscription<FunctionalCoreBoundaryData>> =>
    feature.boundaryFacts(index)

export const functionalCoreBoundaryFacts = (index: FunctionalCoreEffectIndex) =>
  pipe(functionalCoreEffectFeatures, Array.flatMap(boundaryFactsFor(index)))

const shapeFactsFor =
  (index: FunctionalCoreEffectIndex) =>
  (feature: FunctionalCoreEffectFeature): ReadonlyArray<Subscription<FunctionalCoreShapeData>> =>
    feature.shapeFacts(index)

export const functionalCoreShapeFacts = (index: FunctionalCoreEffectIndex) =>
  pipe(functionalCoreEffectFeatures, Array.flatMap(shapeFactsFor(index)))
