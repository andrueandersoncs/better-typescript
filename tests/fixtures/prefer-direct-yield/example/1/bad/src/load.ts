import { Effect, Stream } from "effect"

declare const collectSignals: <A>(
  signals: Stream.Stream<A, Error>
) => Effect.Effect<ReadonlyArray<A>, Error>

declare const subsystemAdvice: Stream.Stream<string, Error>

export const load = Effect.gen(function* () {
  const subsystemAdviceEffect = collectSignals(subsystemAdvice)
  const subsystemItems = yield* subsystemAdviceEffect

  return subsystemItems
})
