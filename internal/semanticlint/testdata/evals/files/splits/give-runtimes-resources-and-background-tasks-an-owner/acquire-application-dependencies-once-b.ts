import * as Effect from "effect/Effect"

type Invoice = {
  readonly id: string
}

type InvoiceRepository = {
  readonly findById: (id: string) => Effect.Effect<Invoice>
}

type ApplicationServices = {
  readonly invoiceRepository: InvoiceRepository
}

declare const applicationServices: ApplicationServices

export const findInvoice = (id: string): Effect.Effect<Invoice> =>
  applicationServices.invoiceRepository.findById(id)

export const invoiceId = (invoice: Invoice): string => invoice.id

export const invoiceReference = (invoice: Invoice): string => `invoice-${invoice.id}`
