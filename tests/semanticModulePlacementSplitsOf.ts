import { Array } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { detectionData } from "./semanticModulePlacementDetectionData.js"

export const splitsOf = (detections: ReadonlyArray<Detection>) =>
  Array.filter(detections, (detection) => detectionData(detection)._tag === "split-semantic-module")
