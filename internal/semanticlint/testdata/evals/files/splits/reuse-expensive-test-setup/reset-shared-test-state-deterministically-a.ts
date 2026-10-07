import { describe, expect, it } from "vitest"

const sentInvoiceIds: string[] = []

const recordInvoice = (invoiceId: string): void => {
  sentInvoiceIds.push(invoiceId)
}

describe("sent invoices", () => {
  it("records the first invoice", () => {
    recordInvoice("inv-1")
    expect(sentInvoiceIds).toEqual(["inv-1"])
  })

  it("records the second invoice", () => {
    recordInvoice("inv-2")
    expect(sentInvoiceIds).toEqual(["inv-1", "inv-2"])
  })
})
