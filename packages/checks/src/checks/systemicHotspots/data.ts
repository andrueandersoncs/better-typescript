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
 * The two named advice streams the preset derive stage hands to the
 * systemic-hotspots fleet.
 *
 * @remarks
 *   This contract remains explicit because the fleet consumes parallel named
 *   streams rather than a positional pair. Removing it would spread that stream
 *   coupling into defaultWiring and let advice wiring drift.
 * @modelRole boundary
 */
export class SystemicHotspotsInput extends Schema.Class<SystemicHotspotsInput>(
  "SystemicHotspotsInput"
)({
  hotSubsystem: adviceSignal,
  highSignalDensity: adviceSignal
}) {
  declare readonly hotSubsystem: Stream.Stream<Advice>
  declare readonly highSignalDensity: Stream.Stream<Advice>
}
