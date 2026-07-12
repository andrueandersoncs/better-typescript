import { Effect, Ref } from "effect"

export const makeCounter: Effect.Effect<Ref.Ref<number>> = Ref.make(0)

export const incrementAndGet = (
  counter: Ref.Ref<number>
): Effect.Effect<number> => Ref.updateAndGet(counter, (current) => current + 1)
