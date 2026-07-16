import { Schema, Stream } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"

const adviceArray = Schema.Array(Advice)

// SystemicSignals is one batch of subsystem-density advice because replay needs one schema.
export class SystemicSignals extends Schema.Class<SystemicSignals>("SystemicSignals")({
  hotSubsystem: adviceArray,
  highSignalDensity: adviceArray
}) {}

const adviceSignal = Schema.Any

// SystemicHotspotsInput is stable boundary input because callers need one stream contract.
export class SystemicHotspotsInput extends Schema.Class<SystemicHotspotsInput>(
  "SystemicHotspotsInput"
)({
  hotSubsystem: adviceSignal,
  highSignalDensity: adviceSignal
}) {
  declare readonly hotSubsystem: Stream.Stream<Advice>
  declare readonly highSignalDensity: Stream.Stream<Advice>
}
