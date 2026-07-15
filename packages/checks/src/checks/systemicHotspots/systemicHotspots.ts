import { Array, Effect, pipe, Stream } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, collectSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import { SystemicHotspotsInput, SystemicSignals } from "./data.js"

const systemicAdvice = (signals: SystemicSignals): ReadonlyArray<Advice> => {
  const hasHotSubsystem = signals.hotSubsystem.length >= 1
  const hasDenseFiles = signals.highSignalDensity.length >= 2
  const hotSubsystemEvidence = Array.make(hasHotSubsystem, hasDenseFiles)
  const isSystemic = Array.every(hotSubsystemEvidence, Boolean)
  const location = adviceLocation("project")
  const subsystemItem = evidenceItem("hot-subsystem", signals.hotSubsystem.length)
  const densityItem = evidenceItem("high-signal-density", signals.highSignalDensity.length)
  const evidence = Array.make(subsystemItem, densityItem)

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

  return isSystemic ? Array.of(advice) : Array.empty()
}

export const systemicHotspots = (input: SystemicHotspotsInput): Stream.Stream<Advice, Error> => {
  const hotSubsystem = collectSignals(input.hotSubsystem)
  const highSignalDensity = collectSignals(input.highSignalDensity)

  return pipe(
    Effect.all({ hotSubsystem, highSignalDensity }),
    Effect.map(systemicAdvice),
    Effect.map(Stream.fromIterable),
    Stream.unwrap
  )
}
