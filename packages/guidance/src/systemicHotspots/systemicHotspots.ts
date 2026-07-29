import { Array, Function } from "effect"
import { Advice, EvidenceItem } from "@better-typescript/core/engine/derive/data"
import { Location } from "@better-typescript/core/engine/location/data"

import { SystemicSignals } from "./data.js"
import { makePackageExamples } from "../definePolicy.js"

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
  const examples = systemicHotspotsExamples

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
    examples
  })

  return isSystemic ? Array.of(advice) : Array.empty()
}

export const systemicHotspots = Function.compose(SystemicSignals.make, systemicAdvice)
