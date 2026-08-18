import { Schema } from "effect"
import { Detection } from "@better-typescript/core/engine/location/detectionData"
import {
  imperativeStateManager as materializeImperativeStateManager,
  imperativeStateManagerExamples
} from "../dist/imperativeStateManager/imperativeStateManager.js"
const detectionArray = Schema.Array(Detection)
export const ImperativeStateSignals = Schema.Struct({
  noMutation: detectionArray,
  preferHashMap: detectionArray,
  preferHashSet: detectionArray,
  noMutableArrayMethods: detectionArray,
  noMutableVariableDeclarations: detectionArray
})
export const MutationElementData = Schema.Struct({ target: Schema.String })
export { imperativeStateManagerExamples }
export const imperativeStateManager = (signals) =>
  materializeImperativeStateManager(
    signals.noMutation,
    signals.preferHashMap,
    signals.preferHashSet,
    signals.noMutableArrayMethods,
    signals.noMutableVariableDeclarations
  )
