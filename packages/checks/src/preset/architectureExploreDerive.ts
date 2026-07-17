import { Array, Stream, pipe } from "effect"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { namedDetection } from "@better-typescript/core/engine/derive"
import type { Advice, NamedDetection } from "@better-typescript/core/engine/derive/data"
import { architectureExploreAdvisers } from "./architectureExploreAdvisers.js"

const nameArchitectureExploreDetections = (signal: Signal): Stream.Stream<NamedDetection> => {
  const toNamedDetection = namedDetection(signal.name)

  return pipe(Stream.fromIterable(signal.detections), Stream.map(toNamedDetection))
}

export const architectureExploreDerive = (
  signals: ReadonlyArray<Signal>
): Stream.Stream<Advice> => {
  const namedElements = pipe(
    Stream.fromIterable(signals),
    Stream.flatMap(nameArchitectureExploreDetections)
  )

  const adviceStreams = Array.map(architectureExploreAdvisers, (adviser) => adviser(namedElements))

  return pipe(Stream.fromIterable(adviceStreams), Stream.flatten())
}
