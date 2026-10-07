type Invoice = {
  readonly id: string
}

const receiptForInvoice = (invoice: Invoice): string =>
  `Receipt ${invoice.id}`

const receiptActions = {
  send: receiptForInvoice,
}

export const sendReceipt = (invoice: Invoice): string =>
  receiptActions["send"](invoice)
