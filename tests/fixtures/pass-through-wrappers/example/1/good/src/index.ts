import { add } from "./math.js"

export const total = (xs: ReadonlyArray<number>): number => xs.reduce(add, 0)
