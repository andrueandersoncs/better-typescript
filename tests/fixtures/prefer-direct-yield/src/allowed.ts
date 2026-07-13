import { Effect, Stream } from "effect"

declare const collectSignals: <A>(
  signals: Stream.Stream<A, Error>
) => Effect.Effect<ReadonlyArray<A>, Error>

declare const subsystemAdvice: Stream.Stream<string, Error>
declare const densityAdvice: Stream.Stream<string, Error>

declare const filterFallback: (
  items: ReadonlyArray<string>
) => (advice: Stream.Stream<string, Error>) => Stream.Stream<string, Error>

declare const Database: Effect.Effect<{ readonly query: () => void }>
declare const fetchUser: (id: string) => Effect.Effect<string>

export const direct = Effect.gen(function* () {
  const items = yield* collectSignals(subsystemAdvice)

  return items
})

export const nestedExtract = Effect.gen(function* () {
  const densityAfterFallbackSuppression = filterFallback([])(densityAdvice)
  const items = yield* collectSignals(densityAfterFallbackSuppression)

  return items
})

export const multiUse = Effect.gen(function* () {
  const cached = collectSignals(subsystemAdvice)
  const first = yield* cached
  const second = yield* cached

  return [first, second] as const
})

export const outerScope = Effect.gen(function* () {
  const db = yield* Database

  return db
})

export const asArgument = Effect.gen(function* () {
  const id = "user-1"
  const user = yield* fetchUser(id)

  return user
})

export function* plainGenerator(): Generator<number[], number, number> {
  const values = [1, 2, 3]
  const first = yield values

  return first
}
