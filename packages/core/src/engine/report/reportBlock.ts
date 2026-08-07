import { Schema } from "effect"
import { reportKeySchema } from "./reportKeySchema.js"

// ReportBlock carries the key and text because each report is a complete snapshot.
export const ReportBlock = Schema.Struct({
  key: reportKeySchema,
  text: Schema.String
})

export interface ReportBlock extends Schema.Schema.Type<typeof ReportBlock> {}
