import * as Effect from "effect/Effect"

export type Invoice = {
  readonly id: string
  readonly accountId: string
}

export interface InvoiceReader {
  findInvoice(accountId: string, invoiceId: string): Effect.Effect<Invoice>
}

export interface InvoiceReaderFactory {
  createInvoiceReader(): InvoiceReader
}

export const loadInvoiceForAccount = (
  accountId: string,
  invoiceId: string,
  factory: InvoiceReaderFactory
): Effect.Effect<Invoice> => {
  const invoiceReader = factory.createInvoiceReader()

  return invoiceReader.findInvoice(accountId, invoiceId)
}
