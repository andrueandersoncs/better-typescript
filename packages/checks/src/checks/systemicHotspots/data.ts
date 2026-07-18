import { Data, Schema, Stream } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"

const adviceArray = Schema.Array(Advice)

// SystemicSignals is one batch of subsystem-density advice because replay needs one schema.
export const SystemicSignals = Schema.Struct({
  hotSubsystem: adviceArray,
  highSignalDensity: adviceArray
})

export interface SystemicSignals extends Schema.Schema.Type<typeof SystemicSignals> {}

// Live stream pair for hotspots because Schema batches cannot hold Streams.
export class SystemicHotspotsInput extends Data.Class<{
  readonly hotSubsystem: Stream.Stream<Advice>
  readonly highSignalDensity: Stream.Stream<Advice>
}> {}
