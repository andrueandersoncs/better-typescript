import { Array, Option, pipe } from "effect"

declare const scores: ReadonlyArray<number>

export const raised: ReadonlyArray<number> = pipe(
  Array.replace(scores, 0, 100),
  Option.getOrElse(() => scores)
)

export const doubled: ReadonlyArray<number> = pipe(
  Array.modify(scores, 0, (score) => score * 2),
  Option.getOrElse(() => scores)
)
