import { Array } from "effect"

declare const items: ReadonlyArray<{ readonly price: number }>

export const total = Array.reduce(
  items,
  0,
  (sum, item) => sum + item.price
)
