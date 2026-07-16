import { Schema, Stream } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

// PipelineSignals is one nested-call/data-last findings batch because replay needs one schema.
export class PipelineSignals extends Schema.Class<PipelineSignals>("PipelineSignals")({
  noNestedCalls: detectionArray,
  preferCurriedDataLastFunctions: detectionArray
}) {}

const detectionSignal = Schema.Any

// PipelineHostileInput is stable boundary input because callers need one stream contract.
export class PipelineHostileInput extends Schema.Class<PipelineHostileInput>(
  "PipelineHostileInput"
)({
  noNestedCalls: detectionSignal,
  preferCurriedDataLastFunctions: detectionSignal
}) {
  declare readonly noNestedCalls: Stream.Stream<Detection>
  declare readonly preferCurriedDataLastFunctions: Stream.Stream<Detection>
}
