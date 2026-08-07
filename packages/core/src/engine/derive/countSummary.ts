import { Schema } from "effect"

const stringCountHashMap = Schema.HashMap(Schema.String, Schema.Number)

// CountSummary holds policy totals and per-policy file breadth because density advice needs them.
export const CountSummary = Schema.Struct({
  total: Schema.Number,
  fileCount: Schema.Number,
  countsByPolicy: stringCountHashMap,
  filesByPolicy: stringCountHashMap
})

export interface CountSummary extends Schema.Schema.Type<typeof CountSummary> {}
