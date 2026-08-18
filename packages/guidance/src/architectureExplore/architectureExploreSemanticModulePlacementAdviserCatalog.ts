import { Array, Tuple } from "effect"
import { semanticModulePlacementAdvice } from "./architectureExploreSemanticModulePlacementAdviser.js"

const semanticModulePlacementEntry = Tuple.make(11, semanticModulePlacementAdvice)

export const architectureExploreSemanticModulePlacementAdviserCatalog = Array.of(
  semanticModulePlacementEntry
)
