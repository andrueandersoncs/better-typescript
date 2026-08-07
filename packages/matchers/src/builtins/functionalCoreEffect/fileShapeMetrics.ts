import { Schema } from "effect"

// FileShapeMetrics is shared file-shape accumulator because folds and thresholds share it.
export const FileShapeMetrics = Schema.Struct({
  branchCount: Schema.Number,
  functionCount: Schema.Number
})

export interface FileShapeMetrics extends Schema.Schema.Type<typeof FileShapeMetrics> {}
