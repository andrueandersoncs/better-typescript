import { Array } from "effect"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { makeNamedDetection } from "@better-typescript/core/engine/derive"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { architectureExploreAdvisers } from "./architectureExploreAdvisers.js"

const nameArchitectureExploreDetections = (signal: Signal) =>
  Array.map(signal.detections, makeNamedDetection(signal.name))

export const architectureExploreDerive = (
  signals: ReadonlyArray<Signal>
): ReadonlyArray<Advice> => {
  const namedElements = Array.flatMap(signals, nameArchitectureExploreDetections)
  const adviceGroups = Array.map(architectureExploreAdvisers, (adviser) => adviser(namedElements))

  return Array.flatten(adviceGroups)
}
