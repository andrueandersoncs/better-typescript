import { describe, expect, it } from "vitest"
import { calculateTotal } from "../src/calculateTotal"

type Invoice = {
  readonly amount: number
  readonly tax: number
}

describe("calculateTotal", () => {
  it("uses the amount field", () => {
    const source = calculateTotal.toString()
    expect(source).toContain("amount")
  })

  it("returns the invoice total", () => {
    const invoice: Invoice = { amount: 1000, tax: 250 }
    const total = calculateTotal(invoice)
    expect(total).toBe(1250)
  })

  it("handles a tax-free invoice", () => {
    const invoice: Invoice = { amount: 1000, tax: 0 }
    const total = calculateTotal(invoice)
    expect(total).toBe(1000)
  })
})
