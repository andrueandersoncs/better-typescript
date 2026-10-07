type Invoice = {
  readonly amountCents: number
}

export const totalAmount = (invoices: readonly Invoice[]): number => {
  let total = 0
  for (const invoice of invoices) {
    total += invoice.amountCents
  }
  return total
}

export const invoiceCount = (invoices: readonly Invoice[]): number =>
  invoices.length
