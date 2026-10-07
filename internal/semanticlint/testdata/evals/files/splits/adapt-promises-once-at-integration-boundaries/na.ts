type Invoice = {
  readonly id: string
  readonly cents: number
}

type InvoiceAmount = {
  readonly invoiceId: string
  readonly dollars: number
}

export const createInvoiceAmount = (invoice: Invoice): InvoiceAmount => ({
  invoiceId: invoice.id,
  dollars: invoice.cents / 100,
})

export const invoiceReference = (invoice: Invoice): string =>
  `invoice-${invoice.id}`

export const hasInvoiceAmount = (invoice: Invoice): boolean =>
  invoice.cents > 0
