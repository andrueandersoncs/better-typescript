import { describe, expect, it } from "vitest"
import { startOrderApplication } from "../src/application"

type OrderRequest = {
  readonly sku: string
  readonly subtotal: number
}

describe("order tax", () => {
  it("starts the application for an order", async () => {
    const request: OrderRequest = { sku: "PEN-1", subtotal: 1000 }
    const application = await startOrderApplication()
    const total = await application.calculateTax(request)
    expect(total).toBe(100)
  })

  it("handles a tax-free order", async () => {
    const request: OrderRequest = { sku: "PEN-1", subtotal: 0 }
    const application = await startOrderApplication()
    const total = await application.calculateTax(request)
    expect(total).toBe(0)
  })
})
