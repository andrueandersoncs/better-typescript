import { describe, expect, it } from "vitest"

const invoiceLabel = (invoiceId: string): string => {
  return `Invoice ${invoiceId}`
}

const hasInvoicePrefix = (label: string): boolean => {
  return label.startsWith("Invoice")
}

describe("invoice labels", () => {
  it("adds an invoice prefix", () => {
    const label = invoiceLabel("A-12")
    const prefixed = hasInvoicePrefix(label)
    expect(prefixed).toBe(true)
  })
})
