import { add } from "./math.js"
import { scale } from "./scale.js"

export const run = (n: number): number => scale(add(n, 1))
