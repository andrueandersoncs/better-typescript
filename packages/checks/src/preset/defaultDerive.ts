import { Array, Effect } from "effect"
import { SystemicHotspotsInput } from "../checks/systemicHotspots/data.js"
import { systemicHotspots } from "../checks/systemicHotspots/systemicHotspots.js"
import { highSignalDensity } from "../checks/highSignalDensity.js"
import { hotSubsystem } from "../checks/hotSubsystem/hotSubsystem.js"
import { ruleDominance } from "../checks/ruleDominance.js"
import { filterFallbackAdviceForUncoveredFiles } from "@better-typescript/core/engine/report"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import type { Advice, NamedDetection } from "@better-typescript/core/engine/derive/data"
import { defaultNamedElements, defaultSpecificAdvice } from "./defaultSpecificAdvice.js"

const materializeDefaultAdvice = Effect.fn("DefaultDerive.materialize")(function* (
  signals: ReadonlyArray<Signal>,
  namedElements: ReadonlyArray<NamedDetection>
): Effect.fn.Return<ReadonlyArray<Advice>> {
  const specificItems = yield* defaultSpecificAdvice(signals)
  const densityItems = yield* highSignalDensity(namedElements)
  const subsystemItems = yield* hotSubsystem(namedElements)
  const dominanceItems = yield* ruleDominance(namedElements)

  const densityAfterFallbackSuppression =
    filterFallbackAdviceForUncoveredFiles(specificItems)(densityItems)

  const systemicInput = new SystemicHotspotsInput({
    hotSubsystem: subsystemItems,
    highSignalDensity: densityAfterFallbackSuppression
  })

  const systemicItems = yield* systemicHotspots(systemicInput)

  const adviceGroups = Array.make(
    specificItems,
    densityAfterFallbackSuppression,
    subsystemItems,
    dominanceItems,
    systemicItems
  )

  return Array.flatten(adviceGroups)
})

export const defaultDerive = Effect.fn("DefaultDerive.derive")(function* (
  signals: ReadonlyArray<Signal>
): Effect.fn.Return<ReadonlyArray<Advice>> {
  const namedElements = defaultNamedElements(signals)

  return yield* materializeDefaultAdvice(signals, namedElements)
})
