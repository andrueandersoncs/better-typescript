import { semanticModulePlacement } from "@better-typescript/guidance/preset/semanticModulePlacementPolicies"
import { emptyCatalog } from "./semanticModulePlacementEmptyCatalog.js"

export const placementPolicy = semanticModulePlacement(emptyCatalog)
