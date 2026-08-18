import { Array, Function, Schema } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { Location } from "@better-typescript/core/engine/location/locationData"

import { makePackageExamples } from "../makePackageExamples.js"

const adviceArray = Schema.Array(Advice)

export const SystemicSignals = Schema.Struct({
  hotSubsystem: adviceArray,
  highSignalDensity: adviceArray
})

export interface SystemicSignals extends Schema.Schema.Type<typeof SystemicSignals> {}

export const systemicHotspotsExamples = makePackageExamples("systemic-hotspots")

const systemicAdvice = (signals: SystemicSignals): ReadonlyArray<Advice> => {
  const hasHotSubsystem = signals.hotSubsystem.length >= 1
  const hasDenseFiles = signals.highSignalDensity.length >= 2
  const hotSubsystemEvidence = Array.make(hasHotSubsystem, hasDenseFiles)
  const isSystemic = Array.every(hotSubsystemEvidence, Boolean)
  const location = Location.make({ path: "project" })

  const subsystemItem = EvidenceItem.make({
    measure: "hot-subsystem",
    count: signals.hotSubsystem.length
  })

  const densityItem = EvidenceItem.make({
    measure: "high-signal-density",
    count: signals.highSignalDensity.length
  })

  const evidence = Array.make(subsystemItem, densityItem)

  const advice = Advice.make({
    location,
    level: "project",
    title: "systemic hotspots",
    remediation:
      "One subsystem dominates the signals and several files are individually dense: " +
      "file-by-file cleanup will thrash. Plan the campaign top-down — rewrite the hot " +
      "subsystem's shape first (Ref/Layer inversion, data-last signatures), let that land " +
      "the architectural pattern, then sweep the remaining dense files against it.",
    evidence,
    examples: systemicHotspotsExamples
  })

  return isSystemic ? Array.of(advice) : Array.empty()
}

export const systemicHotspots = Function.compose(SystemicSignals.make, systemicAdvice)
