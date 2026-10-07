import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const normalizeInvoiceId = (invoiceId: string): string => {
  return invoiceId.trim().toUpperCase()
}

describe("invoice identifier normalization", () => {
  it("works", () => {
    fc.assert(
      fc.property(fc.string(), (invoiceId) => {
        const normalizedId = normalizeInvoiceId(invoiceId)
        const normalizedAgain = normalizeInvoiceId(normalizedId)
        expect(normalizedAgain).toBe(normalizedId)
      }),
    )
  })
})
