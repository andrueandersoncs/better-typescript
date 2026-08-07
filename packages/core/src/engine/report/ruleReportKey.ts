import { Schema } from "effect"

// RuleReportKey is one detection's wire identity because consumers key its tag.
export const RuleReportKey = Schema.TaggedStruct("rule", {
  name: Schema.String,
  message: Schema.String,
  hint: Schema.String
})

export interface RuleReportKey extends Schema.Schema.Type<typeof RuleReportKey> {}
