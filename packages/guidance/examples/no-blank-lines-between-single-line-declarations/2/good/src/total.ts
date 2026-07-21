import { Array } from "effect"

declare const items: ReadonlyArray<number>

export const total = (): number => {
  const start = 0
  const mid = 1

  const sum = Array.reduce(items, 0, (acc, item) => {
    return acc + item
  })

  return sum
}
