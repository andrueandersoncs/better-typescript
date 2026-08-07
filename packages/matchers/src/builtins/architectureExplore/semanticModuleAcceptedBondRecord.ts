import { Schema } from "effect"
import { SemanticModuleBondKey } from "./semanticModuleBondKey.js"
import { semanticModuleEvidenceSchema } from "./semanticModuleEvidenceSchema.js"

// AcceptedBond retains evidence because membership must remain auditable.
export const SemanticModuleAcceptedBondRecord = Schema.Struct({
  key: SemanticModuleBondKey,
  evidence: semanticModuleEvidenceSchema
})

export interface SemanticModuleAcceptedBondRecord extends Schema.Schema.Type<
  typeof SemanticModuleAcceptedBondRecord
> {}
