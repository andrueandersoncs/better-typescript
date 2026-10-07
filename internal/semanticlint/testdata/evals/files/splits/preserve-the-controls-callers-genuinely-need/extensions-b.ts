type Invoice = {
  readonly number: string
  readonly total: number
}

const invoiceRecord = (invoice: Invoice): Invoice => {
  return invoice
}

const invoiceNumber = (invoice: Invoice): string => {
  return invoice.number
}

export const publishInvoice = (invoice: Invoice): Invoice => {
  const number = invoiceNumber(invoice)
  return invoiceRecord({ ...invoice, number })
}
