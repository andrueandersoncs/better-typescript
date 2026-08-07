import { Schema } from "effect"
import { SemanticModuleEntityRecord } from "./semanticModuleEntityRecordSchema.js"

// Placement entity adds portable line/column because Advice cannot reopen the Program.
export const SemanticModulePlacementEntityRecord = Schema.Struct({
  ...SemanticModuleEntityRecord.fields,
  line: Schema.Number,
  column: Schema.Number
})

export interface SemanticModulePlacementEntityRecord extends Schema.Schema.Type<
  typeof SemanticModulePlacementEntityRecord
> {}
