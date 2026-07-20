import { Array, Effect } from "effect"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { makeNamedDetection } from "@better-typescript/core/engine/derive"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { architectureExploreAdvisers } from "./architectureExploreAdvisers.js"

const nameArchitectureExploreDetections = (signal: Signal) =>
  Array.map(signal.detections, makeNamedDetection(signal.name))

export const architectureExploreDerive = Effect.fn("ArchitectureExplore.derive")(function* (
  signals: ReadonlyArray<Signal>
): Effect.fn.Return<ReadonlyArray<Advice>> {
  const namedElements = Array.flatMap(signals, nameArchitectureExploreDetections)

  const adviceGroups = yield* Effect.forEach(architectureExploreAdvisers, (adviser) =>
    adviser(namedElements)
  )

  return Array.flatten(adviceGroups)
})
