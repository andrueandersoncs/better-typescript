import { Schema } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"

const adviceArray = Schema.Array(Advice)

// SystemicSignals is one batch of subsystem-density advice because derive needs one schema.
export const SystemicSignals = Schema.Struct({
  hotSubsystem: adviceArray,
  highSignalDensity: adviceArray
})

export interface SystemicSignals extends Schema.Schema.Type<typeof SystemicSignals> {}
