import { Schema } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import {
  systemicHotspots as materializeSystemicHotspots,
  systemicHotspotsExamples
} from "../dist/systemicHotspots/systemicHotspots.js"
const adviceArray = Schema.Array(Advice)
export const SystemicSignals = Schema.Struct({
  hotSubsystem: adviceArray,
  highSignalDensity: adviceArray
})
export { systemicHotspotsExamples }
export const systemicHotspots = (signals) =>
  materializeSystemicHotspots(signals.hotSubsystem, signals.highSignalDensity)
