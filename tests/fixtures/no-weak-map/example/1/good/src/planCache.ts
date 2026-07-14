import { Effect, HashMap, Option, Ref, pipe } from "effect"

export interface PlanCache {
  readonly planFor: (
    program: object
  ) => Effect.Effect<Option.Option<ReadonlyArray<string>>>
  readonly rememberPlan: (
    program: object,
    plans: ReadonlyArray<string>
  ) => Effect.Effect<void>
}

export const makePlanCache: Effect.Effect<PlanCache> = Effect.gen(function* () {
  const state = yield* Ref.make(
    HashMap.empty<object, ReadonlyArray<string>>()
  )

  const planFor = (program: object) =>
    pipe(state, Ref.get, Effect.map(HashMap.get(program)))

  const rememberPlan = (
    program: object,
    plans: ReadonlyArray<string>
  ): Effect.Effect<void> => Ref.update(state, HashMap.set(program, plans))

  return { planFor, rememberPlan }
})
