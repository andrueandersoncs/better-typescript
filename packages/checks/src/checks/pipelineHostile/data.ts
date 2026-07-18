import { Data, Schema, Stream } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

// PipelineSignals is one nested-call/data-last findings batch because replay needs one schema.
export const PipelineSignals = Schema.Struct({
  noNestedCalls: detectionArray,
  preferCurriedDataLastFunctions: detectionArray
})

export interface PipelineSignals extends Schema.Schema.Type<typeof PipelineSignals> {}

// Live nested-call stream pair because Schema batches cannot hold Streams.
export class PipelineHostileInput extends Data.Class<{
  readonly noNestedCalls: Stream.Stream<Detection>
  readonly preferCurriedDataLastFunctions: Stream.Stream<Detection>
}> {}
