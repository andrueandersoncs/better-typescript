import {
  SemanticModulePlacementModuleSlice,
  type SemanticModulePlacementModuleSlice as ModuleSlice
} from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementModuleSlice.js"
import type { SemanticModulePlacementEntityRecord as PlacementEntity } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementEntityRecord.js"
export const slice = (
  entities: ReadonlyArray<PlacementEntity>,
  physicalModulePaths: ReadonlyArray<string>
): ModuleSlice =>
  SemanticModulePlacementModuleSlice.make({
    entities,
    physicalModulePaths,
    forestBonds: []
  })
