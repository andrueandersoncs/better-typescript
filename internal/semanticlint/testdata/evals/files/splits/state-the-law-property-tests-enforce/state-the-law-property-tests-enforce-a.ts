import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const renderInvoiceShard = (invoiceId: number): number => {
  return invoiceId % 10
}

describe("invoice shard rendering", () => {
  it("maps each generated invoice identifier to its final digit", () => {
    fc.assert(
      fc.property(fc.integer(), (invoiceId) => {
        const shard = renderInvoiceShard(invoiceId)
        const finalDigit = invoiceId % 10
        expect(shard).toBe(finalDigit)
      }),
    )
  })
})
