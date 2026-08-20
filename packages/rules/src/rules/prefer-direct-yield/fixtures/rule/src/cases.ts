import { Effect, Function, Option, Stream } from "effect"

declare const collectSignals: <A>(
  signals: Stream.Stream<A, Error>
) => Effect.Effect<ReadonlyArray<A>, Error>

declare const subsystemAdvice: Stream.Stream<string, Error>
declare const densityAdvice: Stream.Stream<string, Error>
declare const dominanceAdvice: Stream.Stream<string, Error>

declare const filterFallback: (
  items: ReadonlyArray<string>
) => (advice: Stream.Stream<string, Error>) => Stream.Stream<string, Error>

declare const watchMode: Option.Option<boolean>
declare const oneShot: Effect.Effect<void>
declare const watched: Effect.Effect<void>

export const adjacent = Effect.gen(function* () {
  const subsystemAdviceEffect = collectSignals(subsystemAdvice) // ~detect 9
  const subsystemItems = yield* subsystemAdviceEffect

  return subsystemItems
})

export const batched = Effect.gen(function* () {
  const specificItems = yield* collectSignals(subsystemAdvice)

  const densityAfterFallbackSuppression =
    filterFallback(specificItems)(densityAdvice)

  const densityAdviceEffect = collectSignals(densityAfterFallbackSuppression) // ~detect 9
  const subsystemAdviceEffect = collectSignals(subsystemAdvice) // ~detect 9
  const dominanceAdviceEffect = collectSignals(dominanceAdvice) // ~detect 9
  const densityItems = yield* densityAdviceEffect
  const subsystemItems = yield* subsystemAdviceEffect
  const dominanceItems = yield* dominanceAdviceEffect

  return [densityItems, subsystemItems, dominanceItems] as const
})

export const runCommand = Effect.fn("runCommand")(function* () {
  const commandEffect = Option.match(watchMode, { // ~detect 9
    onNone: Function.constant(oneShot),
    onSome: Function.constant(watched)
  })

  yield* commandEffect
})

export const multiline = Effect.gen(function* () {
  const commandEffect = Option.match(watchMode, { // ~detect 9
    onNone: Function.constant(oneShot),
    onSome: Function.constant(watched)
  })

  const result = yield* commandEffect

  return result
})
