export type Invoice = {
  readonly number: string
  readonly totalCents: number
}

type InvoiceQueryCache = {
  readonly invoice: Invoice
}

type InvoicePanelState = {
  readonly selectedTab: "details" | "history"
}

const invoiceQueryCache: InvoiceQueryCache = {
  invoice: { number: "INV-104", totalCents: 2400 }
}

const invoicePanelState: InvoicePanelState = {
  selectedTab: "details"
}

export const invoiceHeading = `${invoiceQueryCache.invoice.number}: ${invoiceQueryCache.invoice.totalCents}`
