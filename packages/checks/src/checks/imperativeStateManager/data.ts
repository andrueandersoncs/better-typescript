import { Schema, Stream } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

/**
 * One materialized batch of imperative-state findings after all five source checks
 * finish.
 *
 * @modelRole boundary
 * @remarks This schema exists because replay must preserve five named evidence streams
 * as one validated batch before cluster advice is derived. Removing it would spread
 * positional collections and synchronization assumptions across the replay and preset
 * wiring.
 */
export class ImperativeStateSignals extends Schema.Class<ImperativeStateSignals>(
  "ImperativeStateSignals"
)({
  noMutation: detectionArray,
  preferHashMap: detectionArray,
  preferHashSet: detectionArray,
  noMutableArrayMethods: detectionArray,
  noMutableVariableDeclarations: detectionArray
}) {}

const detectionSignal = Schema.Any

/**
 * ImperativeStateManagerInput is the stable boundary representation exchanged with
 * imperativeStateManager.
 *
 * @modelRole boundary
 * @remarks It remains explicit because callers need one named contract for noMutation,
 * preferHashMap, preferHashSet, noMutableArrayMethods. Removing it would duplicate
 * boundary translation and let wire and in-memory representations drift.
 */
export class ImperativeStateManagerInput extends Schema.Class<ImperativeStateManagerInput>(
  "ImperativeStateManagerInput"
)({
  noMutation: detectionSignal,
  preferHashMap: detectionSignal,
  preferHashSet: detectionSignal,
  noMutableArrayMethods: detectionSignal,
  noMutableVariableDeclarations: detectionSignal
}) {
  declare readonly noMutation: Stream.Stream<Detection, Error>
  declare readonly preferHashMap: Stream.Stream<Detection, Error>
  declare readonly preferHashSet: Stream.Stream<Detection, Error>
  declare readonly noMutableArrayMethods: Stream.Stream<Detection, Error>
  declare readonly noMutableVariableDeclarations: Stream.Stream<
    Detection,
    Error
  >
}

/**
 * MutationElementData is the stable boundary representation exchanged with
 * isSharedStateMutation.
 *
 * @modelRole boundary
 * @remarks It remains explicit because callers need one named contract for fields,
 * records, Type, Encoded. Removing it would duplicate boundary translation and let wire
 * and in-memory representations drift.
 */
export interface MutationElementData {
  readonly target: string
}

export const MutationElementData = Schema.Struct({
  target: Schema.String
}) satisfies Schema.Schema<MutationElementData>
