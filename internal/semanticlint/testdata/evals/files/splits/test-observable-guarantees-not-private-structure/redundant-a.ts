import { describe, expect, it } from "vitest"
import { calculateTotal } from "../src/calculateTotal"

type Invoice = {
  readonly amount: number
  readonly tax: number
}

const standardInvoice: Invoice = { amount: 1000, tax: 250 }

describe("calculateTotal", () => {
  it("returns the invoice total", () => {
    const total = calculateTotal(standardInvoice)
    expect(total).toBe(1250)
  })

  it("handles a tax-free invoice", () => {
    const invoice: Invoice = { amount: 1000, tax: 0 }
    const total = calculateTotal(invoice)
    expect(total).toBe(1000)
  })

  it("adds amount and tax", () => {
    const total = calculateTotal(standardInvoice)
    expect(total).toBe(1250)
  })
})
