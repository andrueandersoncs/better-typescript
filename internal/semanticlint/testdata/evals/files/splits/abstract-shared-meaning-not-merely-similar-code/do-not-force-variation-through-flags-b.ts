export type Invoice = {
  readonly number: string
  readonly totalCents: number
}

const renderInvoiceSummary = (invoice: Invoice): string => {
  const total = (invoice.totalCents / 100).toFixed(2)
  return `Invoice ${invoice.number}: $${total}`
}

export const renderInvoiceWithTerms = (invoice: Invoice): string => {
  const summary = renderInvoiceSummary(invoice)
  return `${summary}\nDue in 30 days`
}

export const renderInvoiceWithoutTerms = (invoice: Invoice): string => {
  return renderInvoiceSummary(invoice)
}
