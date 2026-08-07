import { Schema } from "effect"

// ServiceSurfaceMetrics is shared service-surface tally because filters share one tally.
export const ServiceSurfaceMetrics = Schema.Struct({
  functionCount: Schema.Number,
  nonFunctionCount: Schema.Number,
  effectfulMemberCount: Schema.Number
})

export interface ServiceSurfaceMetrics extends Schema.Schema.Type<typeof ServiceSurfaceMetrics> {}
