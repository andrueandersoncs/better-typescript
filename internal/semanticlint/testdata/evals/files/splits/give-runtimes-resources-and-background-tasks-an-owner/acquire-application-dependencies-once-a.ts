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

declare const createApplicationServices: () => Effect.Effect<ApplicationServices>

export const findInvoice = (id: string): Effect.Effect<Invoice> =>
  Effect.flatMap(createApplicationServices(), (services) =>
    services.invoiceRepository.findById(id),
  )

export const invoiceId = (invoice: Invoice): string => invoice.id
