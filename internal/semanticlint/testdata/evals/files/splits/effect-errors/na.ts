type Invoice = {
  readonly id: string
  readonly customerId: string
  readonly totalCents: number
}

type InvoiceSummary = {
  readonly customerId: string
  readonly amount: number
}

export const summarizeInvoice = (invoice: Invoice): InvoiceSummary => ({
  customerId: invoice.customerId,
  amount: invoice.totalCents,
})

export const invoiceReference = (invoice: Invoice): string =>
  `invoice-${invoice.id}`

export const hasInvoiceAmount = (invoice: Invoice): boolean =>
  invoice.totalCents > 0
