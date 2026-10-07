import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"

type Invoice = {
  readonly id: string
}

type InvoiceGateway = {
  readonly fetchInvoice: (id: string) => Effect.Effect<Invoice>
}

declare const invoiceGateway: InvoiceGateway

export const fetchInvoice = (id: string): Effect.Effect<Invoice> =>
  Effect.retry(invoiceGateway.fetchInvoice(id), Schedule.recurs(2))

export const invoiceId = (invoice: Invoice): string => invoice.id

export const invoiceReference = (invoice: Invoice): string => `invoice-${invoice.id}`
