import { Schema } from "effect"
import { SemanticModulePlacementModuleSlice } from "./semanticModulePlacementModuleSlice.js"

const moduleSlicesField = Schema.Array(SemanticModulePlacementModuleSlice)

// Mixed placement data is frozen because advice must share one immutable fact shape.
export const MixedPhysicalModulePlacementData = Schema.TaggedStruct("mixed-physical-module", {
  physicalModulePath: Schema.String,
  modules: moduleSlicesField
})

export interface MixedPhysicalModulePlacementData extends Schema.Schema.Type<
  typeof MixedPhysicalModulePlacementData
> {}
