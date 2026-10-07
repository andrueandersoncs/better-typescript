import * as Effect from "effect/Effect"

type Invoice = {
  readonly id: string
}

class InvoiceGatewayFailure {
  readonly _tag = "InvoiceGatewayFailure"
  constructor(readonly cause: unknown) {}
}

type BillingClient = {
  readonly fetchInvoice: (id: string) => Promise<Invoice>
}

declare const billingClient: BillingClient

export const fetchInvoice = (id: string): Effect.Effect<Invoice, InvoiceGatewayFailure> =>
  Effect.tryPromise({
    try: () => billingClient.fetchInvoice(id),
    catch: (cause) => new InvoiceGatewayFailure(cause),
  })

export const invoiceId = (invoice: Invoice): string => invoice.id
