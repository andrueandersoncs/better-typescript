type Invoice = {
  readonly number: string
  readonly total: number
}

type InvoiceOptions = {
  readonly transform?: (invoice: Invoice) => Invoice
}

const defaultInvoice = (invoice: Invoice): Invoice => {
  return invoice
}

export const publishInvoice = (
  invoice: Invoice,
  options: InvoiceOptions = {},
): Invoice => {
  const transform = options.transform ?? defaultInvoice
  return transform(invoice)
}
