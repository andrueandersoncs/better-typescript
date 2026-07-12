import { Effect, Schema, Stream, pipe } from "effect"
import {
  Advice,
  adviceLocation,
  collectSignals,
  evidenceItem
} from "@better-typescript/core/engine/derive"

const adviceArray = Schema.Array(Advice)

class SystemicSignals extends Schema.Class<SystemicSignals>("SystemicSignals")({
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

const systemicAdvice = (signals: SystemicSignals): ReadonlyArray<Advice> => {
  const hasHotSubsystem = signals.hotSubsystem.length >= 1
  const hasDenseFiles = signals.highSignalDensity.length >= 2
  const isSystemic = [hasHotSubsystem, hasDenseFiles].every(Boolean)
  const location = adviceLocation("project")
  const subsystemItem = evidenceItem(
    "hot-subsystem",
    signals.hotSubsystem.length
  )
  const densityItem = evidenceItem(
    "high-signal-density",
    signals.highSignalDensity.length
  )
  const evidence = [subsystemItem, densityItem]
  const advice = new Advice({
    location,
    level: "project",
    title: "systemic hotspots",
    remediation:
      "One subsystem dominates the signals and several files are individually dense: " +
      "file-by-file cleanup will thrash. Plan the campaign top-down — rewrite the hot " +
      "subsystem's shape first (Ref/Layer inversion, data-last signatures), let that land " +
      "the architectural pattern, then sweep the remaining dense files against it.",
    evidence
  })

  return isSystemic ? [advice] : []
}

export const systemicHotspots = (
  input: SystemicHotspotsInput
): Stream.Stream<Advice, Error> => {
  const hotSubsystem = collectSignals(input.hotSubsystem)
  const highSignalDensity = collectSignals(input.highSignalDensity)

  return pipe(
    Effect.all({ hotSubsystem, highSignalDensity }),
    Effect.map(systemicAdvice),
    Effect.map(Stream.fromIterable),
    Stream.unwrap
  )
}
