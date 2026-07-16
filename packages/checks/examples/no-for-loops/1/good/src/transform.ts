import { Array } from "effect"

declare const items: ReadonlyArray<number>

export const doubled = Array.map(items, (item) => item * 2)
