import { describe, expect, it } from "vitest"

const invoiceNumber = (prefix: string, sequence: number): string => {
  return `${prefix}-${sequence}`
}

const displayInvoiceNumber = (value: string): string => {
  return value.toUpperCase()
}

describe("invoice numbers", () => {
  it("formats an invoice number for display", () => {
    const number = invoiceNumber("inv", 42)
    const displayedNumber = displayInvoiceNumber(number)
    expect(displayedNumber).toBe("INV-42")
  })
})
