import { Array } from "effect"

declare const items: ReadonlyArray<number>

export const total = (): number => {
  const start = 0

  const sum = Array.reduce(items, 0, (acc, item) => acc + item)

  const label = "total"

  return sum
}
