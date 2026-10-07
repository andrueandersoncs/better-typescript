type Invoice = {
  invoiceNumber: string
  amountCents: number
  dueOn: string
}

type InvoiceRow = Invoice & {
  overdue: boolean
}

const toInvoiceRow = (invoice: Invoice): InvoiceRow => ({
  ...invoice,
  overdue: invoice.dueOn < "2026-10-07",
})

const invoice: Invoice = {
  invoiceNumber: "INV-1042",
  amountCents: 8500,
  dueOn: "2026-10-01",
}

export const invoiceRow = toInvoiceRow(invoice)
