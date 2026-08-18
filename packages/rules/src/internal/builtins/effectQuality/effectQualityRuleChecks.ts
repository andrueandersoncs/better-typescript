import { Array } from "effect"
import { effectQualityBoundaryChecks } from "./effectQualityBoundaryChecks.js"
import { effectQualityRuntimeChecks } from "./effectQualityRuntimeChecks.js"

export const effectQualityRuleChecks = Array.appendAll(
  effectQualityBoundaryChecks,
  effectQualityRuntimeChecks
)
