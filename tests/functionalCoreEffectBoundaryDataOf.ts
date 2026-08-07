import * as assert from "node:assert/strict"
import { Schema } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { FunctionalCoreBoundaryData } from "@better-typescript/matchers/builtins/functionalCoreEffect/boundaryData"

export const boundaryDataOf = (detection: Detection): FunctionalCoreBoundaryData => {
  assert.ok(Schema.is(FunctionalCoreBoundaryData)(detection.data))
  return detection.data
}
