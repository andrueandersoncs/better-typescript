import * as assert from "node:assert/strict"
import { Schema } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { FunctionalCoreShapeData } from "@better-typescript/matchers/builtins/functionalCoreEffect/shapeData"

export const shapeSummary = (detection: Detection): string => {
  assert.ok(Schema.is(FunctionalCoreShapeData)(detection.data))
  const data = detection.data

  return `${detection.location.path}:${detection.location.line}:${data.kind}:${data.branchCount}:${data.functionCount}:${data.serviceCount}:${data.effectfulMemberCount}:${data.transformationCount}`
}
