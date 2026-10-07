type Invoice = {
  readonly amountCents: number
}

const serviceFeeCents = 250
const receiptFeeCents = 250

export const totalForInvoice = (invoice: Invoice): number =>
  invoice.amountCents + serviceFeeCents

export const totalForReceipt = (invoice: Invoice): number =>
  invoice.amountCents + receiptFeeCents

export const invoiceLabel = (invoice: Invoice): string =>
  `Invoice for ${invoice.amountCents}`
