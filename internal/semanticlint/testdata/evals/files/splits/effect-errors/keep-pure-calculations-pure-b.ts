type Invoice = {
  readonly id: string
  readonly cents: number
}

type InvoiceView = {
  readonly reference: string
  readonly total: string
}

export const createInvoiceView = (invoice: Invoice): InvoiceView => ({
  reference: `invoice-${invoice.id}`,
  total: `$${(invoice.cents / 100).toFixed(2)}`,
})

export const invoiceLabel = (invoice: Invoice): string =>
  `Invoice ${invoice.id}`

export const invoiceReference = (invoice: Invoice): string =>
  `invoice-${invoice.id}`
