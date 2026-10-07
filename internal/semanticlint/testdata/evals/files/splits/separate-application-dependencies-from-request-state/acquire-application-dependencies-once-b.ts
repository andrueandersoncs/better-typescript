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

declare const invoiceReaderFactory: InvoiceReaderFactory

const invoiceReader = invoiceReaderFactory.createInvoiceReader()

export const loadInvoiceForAccount = (
  accountId: string,
  invoiceId: string
): Effect.Effect<Invoice> =>
  invoiceReader.findInvoice(accountId, invoiceId)
