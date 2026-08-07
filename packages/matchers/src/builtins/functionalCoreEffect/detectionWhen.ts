import { Array } from "effect"
import type { Match as FactMatch } from "../../matcher/match.js"
import type { FunctionalCoreBoundaryData } from "./boundaryData.js"
import { emptyDetections } from "./emptyDetections.js"

export const detectionWhen = (
  shouldDetect: boolean,
  detectionValue: FactMatch<FunctionalCoreBoundaryData>
): ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> =>
  shouldDetect ? Array.of(detectionValue) : emptyDetections
