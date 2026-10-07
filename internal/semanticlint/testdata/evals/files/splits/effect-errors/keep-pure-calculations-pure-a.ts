import * as Effect from "effect/Effect"

type Invoice = {
  readonly id: string
  readonly cents: number
}

type InvoiceView = {
  readonly reference: string
  readonly total: string
}

export const createInvoiceView = (invoice: Invoice): Effect.Effect<InvoiceView> =>
  Effect.sync(() => ({
    reference: `invoice-${invoice.id}`,
    total: `$${(invoice.cents / 100).toFixed(2)}`,
  }))

export const invoiceLabel = (invoice: Invoice): string =>
  `Invoice ${invoice.id}`
