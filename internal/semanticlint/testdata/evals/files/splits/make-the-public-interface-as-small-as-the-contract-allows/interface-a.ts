type Invoice = {
  readonly number: string
  readonly total: number
}

export const invoiceSummary = (invoice: Invoice): string => {
  return `${invoice.number}: ${invoice.total}`
}

export const formatInvoiceTitle = (invoice: Invoice): string => {
  const summary = invoiceSummary(invoice)
  return summary.toUpperCase()
}

export const invoiceLabel = (invoice: Invoice): string => {
  return formatInvoiceTitle(invoice)
}
