import { Array, Order, pipe } from "effect"
import { freeze } from "./freeze.js"

export const uniqueSortedPaths = (paths: ReadonlyArray<string>): ReadonlyArray<string> =>
  pipe(paths, Array.dedupe, Array.sort(Order.String), freeze)
