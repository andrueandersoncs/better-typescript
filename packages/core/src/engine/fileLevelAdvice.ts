import { Array, Effect, Function, HashSet, Match, Struct, flow, pipe } from "effect"
import type { Advice } from "./derive/advice.js"
import { strictEqual } from "./equivalence/strictEqual.js"

export const isFileLevelAdvice = flow(Struct.get<Advice, "level">("level"), strictEqual("file"))

export const fileAdvicePath = (advice: Advice) => advice.location.path

// Fallback suppression is required because fallback must not duplicate covered file-level advice.
export const filterFallbackAdviceForUncoveredFiles =
  (specific: ReadonlyArray<Advice>) =>
  (fallbackAdvice: ReadonlyArray<Advice>): ReadonlyArray<Advice> => {
    const fileAdvice = Array.filter(specific, isFileLevelAdvice)
    const paths = Array.map(fileAdvice, fileAdvicePath)
    const coveredFiles = HashSet.fromIterable(paths)

    const isUncovered = (advice: Advice) =>
      pipe(
        Match.value(advice),
        Match.when(isFileLevelAdvice, (fileAdvice) => {
          const path = fileAdvicePath(fileAdvice)

          return !HashSet.has(coveredFiles, path)
        }),
        Match.orElse(Function.constTrue)
      )

    return Array.filter(fallbackAdvice, isUncovered)
  }

export const withFallbackAdvice = Effect.fn("Report.withFallbackAdvice")(function* <E, E2, R, R2>(
  specificAdvice: Effect.Effect<ReadonlyArray<Advice>, E, R>,
  fallbackAdvice: Effect.Effect<ReadonlyArray<Advice>, E2, R2>
): Effect.fn.Return<ReadonlyArray<Advice>, E | E2, R | R2> {
  const specific = yield* specificAdvice
  const fallback = yield* fallbackAdvice
  const uncoveredFallback = filterFallbackAdviceForUncoveredFiles(specific)(fallback)

  return Array.appendAll(specific, uncoveredFallback)
})
