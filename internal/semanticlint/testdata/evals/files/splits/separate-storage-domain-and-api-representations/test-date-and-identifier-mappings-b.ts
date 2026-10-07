import { describe, expect, it } from "vitest"

type InvoiceRow = {
  readonly id: string
  readonly issued_at: string
  readonly total_cents: number
}

type Invoice = {
  readonly id: string
  readonly issuedAt: Date
  readonly totalCents: number
}

type InvoicePayload = {
  readonly invoiceId: string
  readonly issuedAt: string
  readonly totalCents: number
}

const invoiceFromRow = (row: InvoiceRow): Invoice => ({
  id: row.id,
  issuedAt: new Date(row.issued_at),
  totalCents: row.total_cents,
})

export const invoicePayloadFromRow = (row: InvoiceRow): InvoicePayload => {
  const invoice = invoiceFromRow(row)
  return { invoiceId: invoice.id, issuedAt: invoice.issuedAt.toISOString(), totalCents: invoice.totalCents }
}

describe("invoice payload", () => {
  it("maps identifiers and timestamps", () => {
    const row: InvoiceRow = { id: "inv-7", issued_at: "2026-01-01", total_cents: 500 }
    expect(invoicePayloadFromRow(row)).toEqual({ invoiceId: "inv-7", issuedAt: "2026-01-01T00:00:00.000Z", totalCents: 500 })
  })
})
