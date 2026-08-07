import { Schema } from "effect"
import { SemanticModulePlacementModuleSlice } from "./semanticModulePlacementModuleSlice.js"

// moduleSlicesSchema lists placement slices because mixed and split facts share arrays.
export const moduleSlicesSchema = Schema.Array(SemanticModulePlacementModuleSlice)
