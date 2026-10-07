import * as Effect from "effect/Effect"

type Invoice = {
  readonly id: string
  readonly customerId: string
}

class InvoiceMissing {
  readonly _tag = "InvoiceMissing"
  constructor(readonly invoiceId: string) {}
}

type InvoiceRepository = {
  readonly findById: (id: string) => Effect.Effect<Invoice | undefined>
}

declare const invoiceRepository: InvoiceRepository

export const findInvoice = (id: string): Effect.Effect<Invoice, InvoiceMissing> =>
  Effect.flatMap(invoiceRepository.findById(id), (invoice) => {
    return invoice === undefined
      ? Effect.fail(new InvoiceMissing(id))
      : Effect.succeed(invoice)
  })

export const invoiceCustomerId = (invoice: Invoice): string => invoice.customerId
