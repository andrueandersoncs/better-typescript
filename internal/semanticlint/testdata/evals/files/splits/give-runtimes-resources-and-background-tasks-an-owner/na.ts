type Invoice = {
  readonly id: string
  readonly totalCents: number
}

type InvoiceSummary = {
  readonly invoiceId: string
  readonly total: number
}

export const summarizeInvoice = (invoice: Invoice): InvoiceSummary => ({
  invoiceId: invoice.id,
  total: invoice.totalCents,
})

export const invoiceReference = (invoice: Invoice): string =>
  `invoice-${invoice.id}`

export const hasInvoiceAmount = (invoice: Invoice): boolean =>
  invoice.totalCents > 0
