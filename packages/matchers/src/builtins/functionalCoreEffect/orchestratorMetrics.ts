import { Schema } from "effect"

const orchestratorServiceNamesSchema = Schema.Array(Schema.String)

// OrchestratorMetrics is shared shape accumulator because folds share one record.
export const OrchestratorMetrics = Schema.Struct({
  branchCount: Schema.Number,
  yieldCount: Schema.Number,
  transformationCount: Schema.Number,
  serviceNames: orchestratorServiceNamesSchema
})

export interface OrchestratorMetrics extends Schema.Schema.Type<typeof OrchestratorMetrics> {}
