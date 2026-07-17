import { Effect, HashMap, Ref } from "effect"

const emptyExamples = HashMap.empty<string, ReadonlyArray<string>>()

export const makeExampleCache = Effect.gen(function* () {
  const loadedExamples = yield* Ref.make(emptyExamples)

  return loadedExamples
})
