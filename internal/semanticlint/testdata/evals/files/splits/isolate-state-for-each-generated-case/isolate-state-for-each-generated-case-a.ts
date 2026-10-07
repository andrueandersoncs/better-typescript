import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const observedValues: number[] = []

const recordValue = (value: number): number => {
  observedValues.push(value)
  return observedValues.length
}

describe("generated invoice values", () => {
  it("records each generated invoice value", () => {
    fc.assert(
      fc.property(fc.integer(), (value) => {
        const position = recordValue(value)
        expect(position).toBeGreaterThan(0)
      }),
    )
  })
})
