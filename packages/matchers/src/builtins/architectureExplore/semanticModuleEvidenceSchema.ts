import { Schema } from "effect"

// semanticModuleEvidenceSchema is an opaque Json bag because freeze and bond keys share shape.
export const semanticModuleEvidenceSchema = Schema.Record(Schema.String, Schema.Json)
