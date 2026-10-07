import * as Effect from "effect/Effect"

type Invoice = {
  readonly id: string
  readonly total: number
}

type BillingClient = {
  readonly fetchInvoice: (id: string) => Promise<Invoice>
}

declare const billingClient: BillingClient

export const fetchInvoice = (id: string): Effect.Effect<Invoice, Error> =>
  Effect.tryPromise({
    try: () => billingClient.fetchInvoice(id),
    catch: () => new Error("Invoice is unavailable"),
  })

export const formatInvoiceTotal = (invoice: Invoice): string =>
  `$${invoice.total.toFixed(2)}`
