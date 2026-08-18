import { Record } from "effect"
import { effectQualityBoundaryFeature } from "./effectQualityBoundaryFeature.js"
import { effectQualityRuntimeFeature } from "./effectQualityRuntimeFeature.js"

const effectQualityFeatureCatalog = {
  boundary: effectQualityBoundaryFeature,
  runtime: effectQualityRuntimeFeature
} as const

export const effectQualityFeatures = Record.values(effectQualityFeatureCatalog)
