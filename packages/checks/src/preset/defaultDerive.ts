import { Array, Effect, Stream, pipe } from "effect"
import { SystemicHotspotsInput } from "../checks/systemicHotspots/data.js"
import { systemicHotspots } from "../checks/systemicHotspots/systemicHotspots.js"
import { filterFallbackAdviceForUncoveredFiles } from "@better-typescript/core/engine/report"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeDefaultAggregateAdvice,
  defaultNamedElements,
  defaultSpecificAdvice
} from "./defaultSpecificAdvice.js"

const materializeDefaultAdvice = Effect.fn("DefaultDerive.materialize")(function* (
  specificAdvice: Stream.Stream<Advice>,
  densityAdvice: Stream.Stream<Advice>,
  subsystemAdvice: Stream.Stream<Advice>,
  dominanceAdvice: Stream.Stream<Advice>
): Effect.fn.Return<Stream.Stream<Advice>> {
  const specificItems = yield* Stream.runCollect(specificAdvice)

  const densityAfterFallbackSuppression =
    filterFallbackAdviceForUncoveredFiles(specificItems)(densityAdvice)

  const densityItems = yield* Stream.runCollect(densityAfterFallbackSuppression)
  const subsystemItems = yield* Stream.runCollect(subsystemAdvice)
  const dominanceItems = yield* Stream.runCollect(dominanceAdvice)
  const specificReplay = Stream.fromIterable(specificItems)
  const densityReplay = Stream.fromIterable(densityItems)
  const subsystemReplay = Stream.fromIterable(subsystemItems)
  const dominanceReplay = Stream.fromIterable(dominanceItems)

  const systemicInput = new SystemicHotspotsInput({
    hotSubsystem: subsystemReplay,
    highSignalDensity: densityReplay
  })

  const systemicAdvice = systemicHotspots(systemicInput)

  const outputAdviceStreamsSource = Array.make(
    specificReplay,
    densityReplay,
    subsystemReplay,
    dominanceReplay,
    systemicAdvice
  )

  const outputAdviceStreams = Stream.fromIterable(outputAdviceStreamsSource)

  return pipe(outputAdviceStreams, Stream.flatten())
})

export const defaultDerive = (signals: ReadonlyArray<Signal>): Stream.Stream<Advice> => {
  const namedElements = defaultNamedElements(signals)
  const specificAdvice = defaultSpecificAdvice(signals)
  const aggregates = makeDefaultAggregateAdvice(namedElements)

  return pipe(
    materializeDefaultAdvice(
      specificAdvice,
      aggregates.densityAdvice,
      aggregates.subsystemAdvice,
      aggregates.dominanceAdvice
    ),
    Stream.unwrap
  )
}
