import { Data, Schema } from "effect"
import { Detection } from "@better-typescript/core/engine/location/data"

const detectionArray = Schema.Array(Detection)

// ImperativeStateSignals is one batch of five evidence arrays because derive needs one schema.
export const ImperativeStateSignals = Schema.Struct({
  noMutation: detectionArray,
  preferHashMap: detectionArray,
  preferHashSet: detectionArray,
  noMutableArrayMethods: detectionArray,
  noMutableVariableDeclarations: detectionArray
})

export interface ImperativeStateSignals extends Schema.Schema.Type<typeof ImperativeStateSignals> {}

// Five complete detection arrays because advisers consume one finished batch.
export class ImperativeStateManagerInput extends Data.Class<{
  readonly noMutation: ReadonlyArray<Detection>
  readonly preferHashMap: ReadonlyArray<Detection>
  readonly preferHashSet: ReadonlyArray<Detection>
  readonly noMutableArrayMethods: ReadonlyArray<Detection>
  readonly noMutableVariableDeclarations: ReadonlyArray<Detection>
}> {}

// Shared mutation-target evidence because detectors and advice decode one record.
export const MutationElementData = Schema.Struct({
  target: Schema.String
})

export interface MutationElementData extends Schema.Schema.Type<typeof MutationElementData> {}
