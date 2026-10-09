import { describe, expect, it } from "vitest"
import { buildInvoice } from "../src/invoice.js"

const lineItems = [
  { sku: "PLAN-PRO", quantity: 1, unitCents: 4900 },
  { sku: "SEAT", quantity: 3, unitCents: 900 }
]

describe("buildInvoice", () => {
  it("totals line items", () => {
    const invoice = buildInvoice({ customerId: "cus_1", lineItems, issuedAt: new Date("2026-03-01T00:00:00Z") })
    expect(invoice.totalCents).toBe(7600)
  })

  it("assigns a unique invoice number", () => {
    const customerId = `cus_${crypto.randomUUID()}`
    const invoice = buildInvoice({ customerId, lineItems, issuedAt: new Date("2026-03-01T00:00:00Z") })
    expect(invoice.number).toMatch(/^INV-\d{6}$/)
  })

  it("is not overdue on the day it is issued", () => {
    const invoice = buildInvoice({ customerId: "cus_1", lineItems, issuedAt: new Date("2026-03-01T00:00:00Z") })
    expect(invoice.isOverdue(new Date("2026-03-01T15:30:00Z"))).toBe(false)
  })
})
