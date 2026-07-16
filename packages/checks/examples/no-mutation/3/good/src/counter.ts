import { Array } from "effect"

interface Counter {
  readonly count: number
}

declare const counter: Counter
declare const scores: Array.NonEmptyReadonlyArray<number>

export const nextCounter: Counter = {
  count: counter.count + 1
}

export const raised = Array.setHeadNonEmpty(scores, 100)
