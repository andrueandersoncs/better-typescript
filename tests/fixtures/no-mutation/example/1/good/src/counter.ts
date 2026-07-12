import { Array } from "effect"

declare const scores: ReadonlyArray<number>

export const raised = Array.replace(scores, 0, 100)
export const doubled = Array.modify(scores, 0, (score) => score * 2)
