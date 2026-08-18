import { Schema } from "effect"
import { Detection } from "@better-typescript/core/engine/location/detectionData"
import {
  pipelineHostile as materializePipelineHostile,
  pipelineHostileExamples
} from "../dist/pipelineHostile/pipelineHostile.js"
const detectionArray = Schema.Array(Detection)
export const PipelineSignals = Schema.Struct({
  noNestedCalls: detectionArray,
  preferCurriedDataLastFunctions: detectionArray
})
export { pipelineHostileExamples }
export const pipelineHostile = (signals) =>
  materializePipelineHostile(signals.noNestedCalls, signals.preferCurriedDataLastFunctions)
