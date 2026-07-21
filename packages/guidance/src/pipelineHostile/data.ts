import { Data, Schema } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

// PipelineSignals is one nested-call/data-last findings batch because derive needs one schema.
export const PipelineSignals = Schema.Struct({
  noNestedCalls: detectionArray,
  preferCurriedDataLastFunctions: detectionArray
})

export interface PipelineSignals extends Schema.Schema.Type<typeof PipelineSignals> {}

// Complete nested-call detection pair because advisers consume one finished batch.
export class PipelineHostileInput extends Data.Class<{
  readonly noNestedCalls: ReadonlyArray<Detection>
  readonly preferCurriedDataLastFunctions: ReadonlyArray<Detection>
}> {}
