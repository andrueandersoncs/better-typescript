import { Data, Schema, Stream } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

// ImperativeStateSignals is one batch of five evidence streams because replay needs one schema.
export const ImperativeStateSignals = Schema.Struct({
  noMutation: detectionArray,
  preferHashMap: detectionArray,
  preferHashSet: detectionArray,
  noMutableArrayMethods: detectionArray,
  noMutableVariableDeclarations: detectionArray
})

export interface ImperativeStateSignals extends Schema.Schema.Type<typeof ImperativeStateSignals> {}

// Live five-stream input because Schema batches cannot hold Streams.
export class ImperativeStateManagerInput extends Data.Class<{
  readonly noMutation: Stream.Stream<Detection>
  readonly preferHashMap: Stream.Stream<Detection>
  readonly preferHashSet: Stream.Stream<Detection>
  readonly noMutableArrayMethods: Stream.Stream<Detection>
  readonly noMutableVariableDeclarations: Stream.Stream<Detection>
}> {}

// Shared mutation-target evidence because detectors and advice decode one record.
export const MutationElementData = Schema.Struct({
  target: Schema.String
})

export interface MutationElementData extends Schema.Schema.Type<typeof MutationElementData> {}
