import { Effect, Stream } from "effect"

export const collectSignals: <A>(
  signals: Stream.Stream<A, Error>
) => Effect.Effect<ReadonlyArray<A>, Error> = Stream.runCollect
