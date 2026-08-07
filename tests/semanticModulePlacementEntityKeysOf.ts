import { Array } from "effect"
import type { SemanticModulePlacementModuleSlice } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementModuleSlice.js"
export const entityKeysOf = (slice: SemanticModulePlacementModuleSlice) =>
  Array.map(slice.entities, (entity) => entity.key)
