import { Array, Order } from "effect"

export const sortNames = (names: ReadonlyArray<string>): ReadonlyArray<string> =>
  Array.sort(names, Order.String)
