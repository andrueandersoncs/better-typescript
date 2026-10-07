type Invoice = {
  readonly id: string
  readonly amountCents: number
}

export const invoiceLabel = (invoice: Invoice): string =>
  `${invoice.id}:${invoice.amountCents}`

export const invoiceAmount = (invoice: Invoice): number =>
  invoice.amountCents

export const invoiceId = (invoice: Invoice): string => invoice.id
