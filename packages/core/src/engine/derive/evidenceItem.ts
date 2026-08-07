import { Schema } from "effect"

// EvidenceItem is the shared measure/count contract because owners need one vocabulary.
export const EvidenceItem = Schema.Struct({
  measure: Schema.String,
  count: Schema.Number
})

export interface EvidenceItem extends Schema.Schema.Type<typeof EvidenceItem> {}
