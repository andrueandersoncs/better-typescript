import fc from "fast-check"
import { expect, test } from "vitest"

const reverse = <Value>(values: readonly Value[]) => [...values].reverse()

test("reverses every list without losing values", () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (values) => {
      expect(reverse(reverse(values))).toEqual(values)
    }),
    { numRuns: 1 },
  )
})

test("keeps an empty list empty", () => {
  expect(reverse([])).toEqual([])
})
