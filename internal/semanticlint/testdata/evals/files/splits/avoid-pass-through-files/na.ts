type Invoice = {
  readonly id: string
  readonly amountCents: number
}

export const invoiceLabel = (invoice: Invoice): string =>
  `${invoice.id}:${invoice.amountCents}`

export const hasAmount = (invoice: Invoice): boolean =>
  invoice.amountCents > 0

export const invoiceId = (invoice: Invoice): string => invoice.id
