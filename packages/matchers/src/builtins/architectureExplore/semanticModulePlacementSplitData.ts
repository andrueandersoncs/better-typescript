import { Schema } from "effect"
import { SemanticModulePlacementModuleSlice } from "./semanticModulePlacementModuleSlice.js"

const moduleSlicesField = Schema.Array(SemanticModulePlacementModuleSlice)

// Split projection is one multi-file Semantic Module because each split emits once.
export const SplitSemanticModulePlacementData = Schema.TaggedStruct("split-semantic-module", {
  modules: moduleSlicesField
})

export interface SplitSemanticModulePlacementData extends Schema.Schema.Type<
  typeof SplitSemanticModulePlacementData
> {}
