import { Schema, pipe } from "effect"
import type { SemanticModuleEvidence } from "./semanticModuleEvidence.js"

const encodeJson = Schema.encodeSync(Schema.Json)

export const semanticEvidenceKey = (evidence: SemanticModuleEvidence) =>
  pipe(evidence, encodeJson, JSON.stringify)
