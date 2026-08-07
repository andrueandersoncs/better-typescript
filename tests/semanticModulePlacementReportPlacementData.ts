import { Result, Schema } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { MixedPhysicalModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementMixedData.js"
import { SplitSemanticModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementSplitData.js"
import type { SemanticModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine.js"
export const placementData = (
  detection: Detection
): Result.Result<SemanticModulePlacementData, void> => {
  const data = detection.data

  if (
    Schema.is(MixedPhysicalModulePlacementData)(data) ||
    Schema.is(SplitSemanticModulePlacementData)(data)
  ) {
    return Result.succeed(data)
  }

  return Result.failVoid
}
