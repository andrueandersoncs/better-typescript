import { describe, expect, it } from "vitest"
import { calculateTotal } from "../src/calculateTotal"

type Invoice = {
  readonly amount: number
  readonly tax: number
}

const createInvoiceHarness = (amount: number) => {
  const withTax = (tax: number): Invoice => ({ amount, tax })
  const withNoTax = (): Invoice => withTax(0)
  const withStandardTax = (): Invoice => withTax(250)
  return { withNoTax, withStandardTax }
}

describe("calculateTotal", () => {
  it("adds tax", () => {
    const invoice = createInvoiceHarness(1000).withStandardTax()
    const total = calculateTotal(invoice)
    expect(total).toBe(1250)
  })

  it("handles a tax-free invoice", () => {
    const invoice: Invoice = { amount: 1000, tax: 0 }
    const total = calculateTotal(invoice)
    expect(total).toBe(1000)
  })
})
