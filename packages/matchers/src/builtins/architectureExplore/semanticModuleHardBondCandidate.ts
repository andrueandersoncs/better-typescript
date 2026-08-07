import { Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { semanticModuleEvidenceSchema } from "./semanticModuleEvidenceSchema.js"

// HardBondCandidate is an independently proven pair because rules never emit hubs.
export const SemanticModuleHardBondCandidate = Schema.Struct({
  left: SemanticModuleEntityKey,
  right: SemanticModuleEntityKey,
  evidenceKey: Schema.String,
  evidence: semanticModuleEvidenceSchema
})

export interface SemanticModuleHardBondCandidate extends Schema.Schema.Type<
  typeof SemanticModuleHardBondCandidate
> {}
