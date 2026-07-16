import { Array } from "effect"
import type { Stream } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, evidenceItem } from "@better-typescript/core/engine/derive"
import { adviceFromSignalPair } from "../support/advice.js"
import { SystemicHotspotsInput, SystemicSignals } from "./data.js"
import { packageExamples } from "../../defineCheck.js"

export const systemicHotspotsExamples = packageExamples("systemic-hotspots")

const systemicAdvice = (signals: SystemicSignals): ReadonlyArray<Advice> => {
  const hasHotSubsystem = signals.hotSubsystem.length >= 1
  const hasDenseFiles = signals.highSignalDensity.length >= 2
  const hotSubsystemEvidence = Array.make(hasHotSubsystem, hasDenseFiles)
  const isSystemic = Array.every(hotSubsystemEvidence, Boolean)
  const location = adviceLocation("project")
  const subsystemItem = evidenceItem("hot-subsystem", signals.hotSubsystem.length)
  const densityItem = evidenceItem("high-signal-density", signals.highSignalDensity.length)
  const evidence = Array.make(subsystemItem, densityItem)
  const examples = systemicHotspotsExamples()

  const advice = new Advice({
    location,
    level: "project",
    title: "systemic hotspots",
    remediation:
      "One subsystem dominates the signals and several files are individually dense: " +
      "file-by-file cleanup will thrash. Plan the campaign top-down — rewrite the hot " +
      "subsystem's shape first (Ref/Layer inversion, data-last signatures), let that land " +
      "the architectural pattern, then sweep the remaining dense files against it.",
    evidence,
    examples
  })

  return isSystemic ? Array.of(advice) : Array.empty()
}

const systemicSignals = (
  hotSubsystem: ReadonlyArray<Advice>,
  highSignalDensity: ReadonlyArray<Advice>
): SystemicSignals => new SystemicSignals({ hotSubsystem, highSignalDensity })

export const systemicHotspots = (input: SystemicHotspotsInput): Stream.Stream<Advice> => {
  const advice = adviceFromSignalPair(
    input.hotSubsystem,
    input.highSignalDensity,
    systemicSignals,
    systemicAdvice
  )

  return advice
}
