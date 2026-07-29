import { Array, Order } from "effect"

const byName = Order.String

export const sortNames = (names: ReadonlyArray<string>): ReadonlyArray<string> =>
  Array.sort(names, byName)
