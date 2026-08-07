import type { Schema } from "effect"
import type { semanticModuleEvidenceSchema } from "./semanticModuleEvidenceSchema.js"

// SemanticModuleEvidence aliases the bag schema because freeze and keying share one type.
export type SemanticModuleEvidence = Schema.Schema.Type<typeof semanticModuleEvidenceSchema>
