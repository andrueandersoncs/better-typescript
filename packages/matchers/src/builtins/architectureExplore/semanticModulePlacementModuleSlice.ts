import { Schema } from "effect"
import { SemanticModuleAcceptedBondRecord } from "./semanticModuleAcceptedBondRecord.js"
import { SemanticModulePlacementEntityRecord } from "./semanticModulePlacementEntityRecord.js"
import { stringArray } from "./stringArraySchema.js"

const forestBondsSchema = Schema.Array(SemanticModuleAcceptedBondRecord)
const placementEntityRecordsSchema = Schema.Array(SemanticModulePlacementEntityRecord)

// Placement slice freezes members because reports must not mutate snapshot membership.
export const SemanticModulePlacementModuleSlice = Schema.Struct({
  entities: placementEntityRecordsSchema,
  physicalModulePaths: stringArray,
  forestBonds: forestBondsSchema
})

export interface SemanticModulePlacementModuleSlice extends Schema.Schema.Type<
  typeof SemanticModulePlacementModuleSlice
> {}
