import { semanticModulePlacement } from "@better-typescript/guidance/preset/architectureExploreCorePolicies"
import { emptyCatalog } from "./semanticModulePlacementEmptyCatalog.js"

export const placementPolicy = semanticModulePlacement(emptyCatalog)
