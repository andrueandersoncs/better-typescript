import { describe, expect, it } from "vitest"

type InvoiceRow = {
  readonly id: string
  readonly issued_at: string
  readonly reconciliation_token: string
}

type Invoice = {
  readonly id: string
  readonly issuedAt: Date
  readonly reconciliationToken: string
}

type InvoicePayload = {
  readonly invoiceId: string
  readonly issuedAt: string
}

const invoiceFromRow = (row: InvoiceRow): Invoice => ({
  id: row.id,
  issuedAt: new Date(row.issued_at),
  reconciliationToken: row.reconciliation_token,
})

export const invoicePayloadFromRow = (row: InvoiceRow): InvoicePayload => {
  const invoice = invoiceFromRow(row)
  return { invoiceId: invoice.id, issuedAt: invoice.issuedAt.toISOString() }
}

describe("invoice payload", () => {
  it("maps identifiers and timestamps", () => {
    const row: InvoiceRow = { id: "inv-7", issued_at: "2026-01-01", reconciliation_token: "r-1" }
    expect(invoicePayloadFromRow(row)).toEqual({ invoiceId: "inv-7", issuedAt: "2026-01-01T00:00:00.000Z" })
  })
})
