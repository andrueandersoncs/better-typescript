import * as Effect from "effect/Effect"

type Invoice = {
  readonly id: string
}

class InvoiceGatewayFailure {
  readonly _tag = "InvoiceGatewayFailure"
  constructor(readonly cause: unknown) {}
}

type InvoiceGateway = {
  readonly readInvoice: (id: string) => Effect.Effect<Invoice, InvoiceGatewayFailure>
}

declare const invoiceGateway: InvoiceGateway

export const loadInvoice = (id: string): Effect.Effect<Invoice, InvoiceGatewayFailure> =>
  invoiceGateway.readInvoice(id)

export const invoiceId = (invoice: Invoice): string => invoice.id

export const invoiceReference = (invoice: Invoice): string => `invoice-${invoice.id}`
