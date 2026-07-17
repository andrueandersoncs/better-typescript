import { Array, Stream, pipe } from "effect"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { namedDetection } from "@better-typescript/core/engine/derive"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { architectureExploreAdvisers } from "./architectureExploreAdvisers.js"

const nameArchitectureExploreDetections = (signal: Signal) =>
  Array.map(signal.detections, namedDetection(signal.name))

export const architectureExploreDerive = (
  signals: ReadonlyArray<Signal>
): Stream.Stream<Advice> => {
  const namedElementsSource = Array.flatMap(signals, nameArchitectureExploreDetections)
  const namedElements = Stream.fromIterable(namedElementsSource)
  const adviceStreams = Array.map(architectureExploreAdvisers, (adviser) => adviser(namedElements))

  return pipe(Stream.fromIterable(adviceStreams), Stream.flatten())
}
