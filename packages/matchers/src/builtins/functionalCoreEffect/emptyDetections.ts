import { Array } from "effect"
import type { Match as FactMatch } from "../../matcher/match.js"
import type { FunctionalCoreBoundaryData } from "./boundaryData.js"

export const emptyDetections: ReadonlyArray<FactMatch<FunctionalCoreBoundaryData>> = Array.empty()
