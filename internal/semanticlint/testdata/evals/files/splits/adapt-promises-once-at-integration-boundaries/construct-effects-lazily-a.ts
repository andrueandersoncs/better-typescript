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

export const fetchInvoice = (id: string): Effect.Effect<Invoice, InvoiceGatewayFailure> => {
  const invoicePromise = billingClient.fetchInvoice(id)

  return Effect.tryPromise({
    try: () => invoicePromise,
    catch: (cause) => new InvoiceGatewayFailure(cause),
  })
}
