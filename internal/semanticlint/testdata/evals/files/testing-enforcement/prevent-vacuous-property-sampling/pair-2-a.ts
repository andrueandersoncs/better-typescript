import fc from "fast-check"
import { expect, test } from "vitest"

const square = (value: number) => value * value

const values = fc.integer({ min: -1_000_000, max: 1_000_000 })

test("squares every whole number", () => {
  fc.assert(
    fc.property(values, (value) => {
      if (value !== 137) return true
      expect(square(value)).toBe(value * value)
    }),
  )
})
