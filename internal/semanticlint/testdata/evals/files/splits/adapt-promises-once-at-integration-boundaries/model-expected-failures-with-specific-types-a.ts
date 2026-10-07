import * as Effect from "effect/Effect"

type Invoice = {
  readonly id: string
}

type BillingClient = {
  readonly fetchInvoice: (id: string) => Promise<Invoice>
}

type FailureWithCause = Error & {
  readonly cause: unknown
}

declare const billingClient: BillingClient

export const fetchInvoice = (id: string): Effect.Effect<Invoice, FailureWithCause> =>
  Effect.tryPromise({
    try: () => billingClient.fetchInvoice(id),
    catch: (cause) => Object.assign(new Error("Invoice request failed"), { cause }),
  })

export const invoiceId = (invoice: Invoice): string => invoice.id
