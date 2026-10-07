import { describe, expect, it } from "vitest"
import * as fc from "fast-check"
import { parseOrderLine } from "../src/parseOrderLine"

describe("parseOrderLine", () => {
  it("rejects invalid quantities in incoming orders", () => {
    const quantity = fc.integer({ min: 1, max: 500 })

    fc.assert(fc.property(quantity, (value) => {
      const result = parseOrderLine({ sku: "keyboard", quantity: value })

      expect(result._tag).toBe("InvalidQuantity")
    }))
  })
})
