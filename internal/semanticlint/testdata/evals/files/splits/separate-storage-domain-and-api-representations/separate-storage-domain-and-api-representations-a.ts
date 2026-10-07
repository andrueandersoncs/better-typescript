import { describe, expect, it } from "vitest"

type InvoiceRow = {
  readonly id: string
  readonly issued_at: string
  readonly total_cents: number
}

type InvoicePayload = {
  readonly invoiceId: string
  readonly issuedAt: string
  readonly totalCents: number
}

export const invoicePayloadFromRow = (row: InvoiceRow): InvoicePayload => ({
  invoiceId: row.id,
  issuedAt: row.issued_at,
  totalCents: row.total_cents,
})

describe("invoice payload", () => {
  it("maps identifiers and timestamps", () => {
    const row: InvoiceRow = { id: "inv-7", issued_at: "2026-01-01", total_cents: 500 }
    expect(invoicePayloadFromRow(row)).toEqual({ invoiceId: "inv-7", issuedAt: "2026-01-01", totalCents: 500 })
  })
})
