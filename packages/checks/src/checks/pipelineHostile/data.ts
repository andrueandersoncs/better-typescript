import { Schema, Stream } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

/**
 * One materialized batch of nested-call and data-last findings for pipeline analysis.
 *
 * @modelRole boundary
 * @remarks This schema exists because replay must preserve the two named source streams
 * as one validated batch before cluster advice is derived. Removing it would duplicate
 * synchronization and positional pairing across the replay and preset wiring.
 */
export class PipelineSignals extends Schema.Class<PipelineSignals>(
  "PipelineSignals"
)({
  noNestedCalls: detectionArray,
  preferCurriedDataLastFunctions: detectionArray
}) {}

const detectionSignal = Schema.Any

/**
 * PipelineHostileInput is the stable boundary representation exchanged with
 * pipelineHostile.
 *
 * @modelRole boundary
 * @remarks It remains explicit because callers need one named contract for
 * noNestedCalls, preferCurriedDataLastFunctions. Removing it would duplicate boundary
 * translation and let wire and in-memory representations drift.
 */
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
