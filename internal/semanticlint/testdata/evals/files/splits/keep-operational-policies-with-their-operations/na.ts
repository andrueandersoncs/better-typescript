type Invoice = {
  readonly id: string
  readonly totalCents: number
}

type InvoiceSummary = {
  readonly invoiceId: string
  readonly amount: number
}

export const summarizeInvoice = (invoice: Invoice): InvoiceSummary => ({
  invoiceId: invoice.id,
  amount: invoice.totalCents,
})

export const invoiceReference = (invoice: Invoice): string =>
  `invoice-${invoice.id}`

export const hasInvoiceAmount = (invoice: Invoice): boolean =>
  invoice.totalCents > 0
