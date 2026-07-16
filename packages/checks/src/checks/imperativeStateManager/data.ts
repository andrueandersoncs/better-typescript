import { Schema, Stream } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

// ImperativeStateSignals is one batch of five evidence streams because replay needs one schema.
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

// ImperativeStateManagerInput is stable boundary input because callers need one contract.
export class ImperativeStateManagerInput extends Schema.Class<ImperativeStateManagerInput>(
  "ImperativeStateManagerInput"
)({
  noMutation: detectionSignal,
  preferHashMap: detectionSignal,
  preferHashSet: detectionSignal,
  noMutableArrayMethods: detectionSignal,
  noMutableVariableDeclarations: detectionSignal
}) {
  declare readonly noMutation: Stream.Stream<Detection>
  declare readonly preferHashMap: Stream.Stream<Detection>
  declare readonly preferHashSet: Stream.Stream<Detection>
  declare readonly noMutableArrayMethods: Stream.Stream<Detection>
  declare readonly noMutableVariableDeclarations: Stream.Stream<Detection>
}

// MutationElementData is the mutation boundary payload because callers need one contract.
export interface MutationElementData {
  readonly target: string
}

export const MutationElementData = Schema.Struct({
  target: Schema.String
}) satisfies Schema.Schema<MutationElementData>
