import * as assert from "node:assert/strict"
import { Schema } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import {
  SemanticModulePlacementData,
  type SemanticModulePlacementData as PlacementData
} from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine.js"
const isPlacementData = Schema.is(SemanticModulePlacementData)

export const detectionData = (detection: Detection): PlacementData => {
  assert.equal(isPlacementData(detection.data), true, "detection data must be placement data")

  return detection.data as PlacementData
}
