import { Schema, Stream } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"

const adviceArray = Schema.Array(Advice)

/**
 * One materialized batch of subsystem-density advice used to derive systemic
 * hotspots.
 *
 * @remarks
 *   This schema exists because replay must preserve hot-subsystem and signal-
 *   density evidence as one validated batch. Removing it would duplicate
 *   synchronization and positional pairing across the replay and preset
 *   wiring.
 * @modelRole boundary
 */
export class SystemicSignals extends Schema.Class<SystemicSignals>("SystemicSignals")({
  hotSubsystem: adviceArray,
  highSignalDensity: adviceArray
}) {}

const adviceSignal = Schema.Any

/**
 * SystemicHotspotsInput is the stable boundary representation exchanged with
 * systemicHotspots.
 *
 * @remarks
 *   It remains explicit because callers need one named contract for hotSubsystem,
 *   highSignalDensity. Removing it would duplicate boundary translation and let
 *   wire and in-memory representations drift.
 * @modelRole boundary
 */
export class SystemicHotspotsInput extends Schema.Class<SystemicHotspotsInput>(
  "SystemicHotspotsInput"
)({
  hotSubsystem: adviceSignal,
  highSignalDensity: adviceSignal
}) {
  declare readonly hotSubsystem: Stream.Stream<Advice, Error>
  declare readonly highSignalDensity: Stream.Stream<Advice, Error>
}
