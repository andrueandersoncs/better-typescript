import { Schema, Stream } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

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

export interface MutationElementData {
  readonly target: string
}

export const MutationElementData = Schema.Struct({
  target: Schema.String
}) satisfies Schema.Schema<MutationElementData>
