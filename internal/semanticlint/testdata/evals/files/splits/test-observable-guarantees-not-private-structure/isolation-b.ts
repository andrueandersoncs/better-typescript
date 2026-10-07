import { describe, expect, it } from "vitest"
import { calculateOrderTax } from "../src/calculateOrderTax"

type OrderRequest = {
  readonly sku: string
  readonly subtotal: number
}

describe("order tax", () => {
  it("calculates tax for an order", () => {
    const request: OrderRequest = { sku: "PEN-1", subtotal: 1000 }
    const total = calculateOrderTax(request)
    expect(total).toBe(100)
  })

  it("handles a tax-free order", () => {
    const request: OrderRequest = { sku: "PEN-1", subtotal: 0 }
    const total = calculateOrderTax(request)
    expect(total).toBe(0)
  })
})
