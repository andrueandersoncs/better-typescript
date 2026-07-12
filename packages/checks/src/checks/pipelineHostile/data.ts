import { Schema, Stream } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

export class PipelineSignals extends Schema.Class<PipelineSignals>(
  "PipelineSignals"
)({
  noNestedCalls: detectionArray,
  preferCurriedDataLastFunctions: detectionArray
}) {}

const detectionSignal = Schema.Any

export class PipelineHostileInput extends Schema.Class<PipelineHostileInput>(
  "PipelineHostileInput"
)({
  noNestedCalls: detectionSignal,
  preferCurriedDataLastFunctions: detectionSignal
}) {
  declare readonly noNestedCalls: Stream.Stream<Detection, Error>
  declare readonly preferCurriedDataLastFunctions: Stream.Stream<
    Detection,
    Error
  >
}
