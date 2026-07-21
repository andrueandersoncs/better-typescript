import { Array } from "effect"
import { SystemicSignals } from "../systemicHotspots/data.js"
import { systemicHotspots } from "../systemicHotspots/systemicHotspots.js"
import { highSignalDensity } from "../derive/highSignalDensity.js"
import { hotSubsystem } from "../hotSubsystem/hotSubsystem.js"
import { ruleDominance } from "../derive/ruleDominance.js"
import { filterFallbackAdviceForUncoveredFiles } from "@better-typescript/core/engine/report"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import type { Advice, NamedDetection } from "@better-typescript/core/engine/derive/data"
import { defaultNamedElements, defaultSpecificAdvice } from "./defaultSpecificAdvice.js"

const materializeDefaultAdvice = (
  signals: ReadonlyArray<Signal>,
  namedElements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const specificItems = defaultSpecificAdvice(signals)
  const densityItems = highSignalDensity(namedElements)
  const subsystemItems = hotSubsystem(namedElements)
  const dominanceItems = ruleDominance(namedElements)

  const densityAfterFallbackSuppression =
    filterFallbackAdviceForUncoveredFiles(specificItems)(densityItems)

  const systemicSignals = SystemicSignals.make({
    hotSubsystem: subsystemItems,
    highSignalDensity: densityAfterFallbackSuppression
  })

  const systemicItems = systemicHotspots(systemicSignals)

  const adviceGroups = Array.make(
    specificItems,
    densityAfterFallbackSuppression,
    subsystemItems,
    dominanceItems,
    systemicItems
  )

  return Array.flatten(adviceGroups)
}

export const defaultDerive = (signals: ReadonlyArray<Signal>): ReadonlyArray<Advice> => {
  const namedElements = defaultNamedElements(signals)

  return materializeDefaultAdvice(signals, namedElements)
}
