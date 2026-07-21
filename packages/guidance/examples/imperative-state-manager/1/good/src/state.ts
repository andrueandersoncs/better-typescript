import { Effect, Ref } from "effect"

const increment = (value: number): number => value + 1

export const incrementEightTimes = Effect.gen(function* () {
  const state = yield* Ref.make(0)

  yield* Ref.update(state, increment)
  yield* Ref.update(state, increment)
  yield* Ref.update(state, increment)
  yield* Ref.update(state, increment)
  yield* Ref.update(state, increment)
  yield* Ref.update(state, increment)
  yield* Ref.update(state, increment)
  yield* Ref.update(state, increment)

  return yield* Ref.get(state)
})
