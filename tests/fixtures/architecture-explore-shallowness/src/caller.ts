import { add, a, b, c, d } from "./thin.js"

export const use = (n: number): number => add(n, a + b + c + d)
