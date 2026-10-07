import { describe, expect, it } from "vitest"

type InvoiceRow = {
  readonly id: string
  readonly issued_at: string
}

type Invoice = {
  readonly id: string
  readonly issuedAt: Date
}

type InvoicePayload = {
  readonly invoiceId: string
  readonly issuedAt: string
}

const invoiceFromRow = (row: InvoiceRow): Invoice => ({
  id: row.id,
  issuedAt: new Date(row.issued_at),
})

export const invoicePayloadFromRow = (row: InvoiceRow): InvoicePayload => {
  const invoice = invoiceFromRow(row)
  return { invoiceId: invoice.id, issuedAt: invoice.issuedAt.toISOString() }
}

describe("invoice payload", () => {
  it("maps identifiers and timestamps", () => {
    const row: InvoiceRow = { id: "INV-009", issued_at: "2026-01-01" }
    expect(invoicePayloadFromRow(row)).toEqual({ invoiceId: "INV-009", issuedAt: "2026-01-01T00:00:00.000Z" })
  })
})
