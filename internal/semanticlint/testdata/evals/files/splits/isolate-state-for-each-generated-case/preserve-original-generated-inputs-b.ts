import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const sortAmountsInPlace = (amounts: number[]): number[] => {
  return amounts.sort((left, right) => left - right)
}

const firstAmount = (amounts: ReadonlyArray<number>): number | undefined => {
  return amounts[0]
}

describe("generated payment amounts", () => {
  it("sorts every generated payment amount", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (amounts) => {
        const originalAmounts = [...amounts]
        const sortedAmounts = sortAmountsInPlace(amounts)
        expect(firstAmount(sortedAmounts)).toEqual(firstAmount(originalAmounts))
      }),
    )
  })
})
