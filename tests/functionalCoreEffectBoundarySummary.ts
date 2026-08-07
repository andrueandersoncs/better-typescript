import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { boundaryDataOf } from "./functionalCoreEffectBoundaryDataOf.js"

export const boundarySummary = (detection: Detection): string => {
  const data = boundaryDataOf(detection)

  return `${detection.location.path}:${detection.location.line}:${data.kind}:${data.subject}`
}
