import { Schema } from "effect"
import { Detection } from "@better-typescript/core/engine/location/detectionData"

const detectionArray = Schema.Array(Detection)

// PipelineSignals is one nested-call/data-last findings batch because derive needs one schema.
export const PipelineSignals = Schema.Struct({
  noNestedCalls: detectionArray,
  preferCurriedDataLastFunctions: detectionArray
})

export interface PipelineSignals extends Schema.Schema.Type<typeof PipelineSignals> {}
