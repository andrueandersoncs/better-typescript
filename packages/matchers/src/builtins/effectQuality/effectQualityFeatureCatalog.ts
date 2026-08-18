import { Array } from "effect"
import { effectQualityBoundaryFeature } from "./effectQualityBoundaryFeature.js"
import { effectQualityRuntimeFeature } from "./effectQualityRuntimeFeature.js"

export const effectQualityFeatures = Array.make(
  effectQualityBoundaryFeature,
  effectQualityRuntimeFeature
)
