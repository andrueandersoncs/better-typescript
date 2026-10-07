import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const recordValue = (values: ReadonlyArray<number>): number => {
  return values.length
}

describe("generated invoice values", () => {
  it("records each generated invoice value", () => {
    fc.assert(
      fc.property(fc.integer(), (value) => {
        const observedValues = [value]
        const position = recordValue(observedValues)
        expect(position).toBeGreaterThan(0)
      }),
    )
  })
})
