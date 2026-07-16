import { Schema, Stream } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

/**
 * One materialized batch of nested-call and data-last findings for pipeline
 * analysis.
 *
 * @remarks
 *   This schema exists because replay must preserve the two named source streams
 *   as one validated batch before cluster advice is derived. Removing it would
 *   duplicate synchronization and positional pairing across the replay and
 *   preset wiring.
 * @modelRole boundary
 */
export class PipelineSignals extends Schema.Class<PipelineSignals>("PipelineSignals")({
  noNestedCalls: detectionArray,
  preferCurriedDataLastFunctions: detectionArray
}) {}

const detectionSignal = Schema.Any

/**
 * The two named evidence streams the preset derive stage hands to the
 * pipeline-hostile fleet.
 *
 * @remarks
 *   This contract remains explicit because the fleet consumes parallel named
 *   streams rather than a positional pair. Removing it would spread that stream
 *   coupling into defaultWiring and let source-check wiring drift.
 * @modelRole boundary
 */
export class PipelineHostileInput extends Schema.Class<PipelineHostileInput>(
  "PipelineHostileInput"
)({
  noNestedCalls: detectionSignal,
  preferCurriedDataLastFunctions: detectionSignal
}) {
  declare readonly noNestedCalls: Stream.Stream<Detection>
  declare readonly preferCurriedDataLastFunctions: Stream.Stream<Detection>
}
