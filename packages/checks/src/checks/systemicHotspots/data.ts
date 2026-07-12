import { Schema, Stream } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"

const adviceArray = Schema.Array(Advice)

export class SystemicSignals extends Schema.Class<SystemicSignals>(
  "SystemicSignals"
)({
  hotSubsystem: adviceArray,
  highSignalDensity: adviceArray
}) {}

const adviceSignal = Schema.Any

export class SystemicHotspotsInput extends Schema.Class<SystemicHotspotsInput>(
  "SystemicHotspotsInput"
)({
  hotSubsystem: adviceSignal,
  highSignalDensity: adviceSignal
}) {
  declare readonly hotSubsystem: Stream.Stream<Advice, Error>
  declare readonly highSignalDensity: Stream.Stream<Advice, Error>
}
