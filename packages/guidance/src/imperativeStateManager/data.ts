import { Schema } from "effect"
import { Detection } from "@better-typescript/core/engine/location/detectionData"

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
