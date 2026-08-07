import { Schema } from "effect"

// AdviceReportKey is one advice block's wire identity because NDJSON keys it.
export const AdviceReportKey = Schema.TaggedStruct("advice", {
  level: Schema.String,
  path: Schema.String,
  title: Schema.String
})

export interface AdviceReportKey extends Schema.Schema.Type<typeof AdviceReportKey> {}
