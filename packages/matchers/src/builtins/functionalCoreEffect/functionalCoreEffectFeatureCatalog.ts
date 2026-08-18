import { Record } from "effect"
import { dependencyCapabilityFeature } from "./dependencyCapabilityFeature.js"
import { effectRuntimeProvisioningFeature } from "./effectRuntimeProvisioningFeature.js"
import { importTypeResolutionFeature } from "./importTypeResolutionFeature.js"
import { orchestrationShapeFeature } from "./orchestrationShapeFeature.js"
import { portAdapterResourceLifetimeFeature } from "./portAdapterResourceLifetimeFeature.js"

const functionalCoreEffectFeatureCatalog = {
  dependencyCapability: dependencyCapabilityFeature,
  effectRuntimeProvisioning: effectRuntimeProvisioningFeature,
  portAdapterResourceLifetime: portAdapterResourceLifetimeFeature,
  importTypeResolution: importTypeResolutionFeature,
  orchestrationShape: orchestrationShapeFeature
} as const

export const functionalCoreEffectFeatures = Record.values(functionalCoreEffectFeatureCatalog)
