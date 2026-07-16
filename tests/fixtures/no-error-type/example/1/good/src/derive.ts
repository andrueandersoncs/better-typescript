import { Effect, Stream } from "effect"

export const collectSignals: <A, E, R>(
  signals: Stream.Stream<A, E, R>
) => Effect.Effect<ReadonlyArray<A>, E, R> = Stream.runCollect
