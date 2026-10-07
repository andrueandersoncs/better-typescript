type Invoice = {
  readonly amountCents: number
}

export const totalAmount = (invoices: readonly Invoice[]): number =>
  invoices.reduce((total, invoice) => total + invoice.amountCents, 0)

export const invoiceCount = (invoices: readonly Invoice[]): number =>
  invoices.length

export const invoiceAmounts = (invoices: readonly Invoice[]): readonly number[] =>
  invoices.map((invoice) => invoice.amountCents)
