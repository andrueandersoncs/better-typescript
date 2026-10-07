export type Invoice = {
  readonly number: string
  readonly totalCents: number
}

export const renderInvoice = (
  invoice: Invoice,
  includePaymentTerms: boolean,
): string => {
  const total = (invoice.totalCents / 100).toFixed(2)
  if (includePaymentTerms) {
    return `Invoice ${invoice.number}: $${total}\nDue in 30 days`
  }
  return `Invoice ${invoice.number}: $${total}`
}
