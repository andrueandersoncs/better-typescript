import { Effect, Ref } from "effect"

export const program = Effect.gen(function* () {
  const state = yield* Ref.make(0)

  return yield* Ref.get(state)
})
