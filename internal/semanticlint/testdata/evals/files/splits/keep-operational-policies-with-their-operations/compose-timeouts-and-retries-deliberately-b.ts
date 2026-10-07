import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"

type Invoice = {
  readonly id: string
}

type InvoiceGateway = {
  readonly fetchInvoice: (id: string) => Effect.Effect<Invoice>
}

declare const invoiceGateway: InvoiceGateway

export const fetchWithinTotalBudget = (id: string) =>
  Effect.timeout(
    Effect.retry(invoiceGateway.fetchInvoice(id), Schedule.recurs(2)),
    "2 seconds",
  )

export const invoiceId = (invoice: Invoice): string => invoice.id
