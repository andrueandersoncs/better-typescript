export type Invoice = {
  readonly number: string
  readonly totalCents: number
}

type InvoiceQueryCache = {
  readonly invoice: Invoice
}

type InvoicePanelState = {
  readonly invoice: Invoice
  readonly selectedTab: "details" | "history"
}

const invoiceQueryCache: InvoiceQueryCache = {
  invoice: { number: "INV-104", totalCents: 2400 }
}

const invoicePanelState: InvoicePanelState = {
  invoice: { number: "INV-104", totalCents: 2400 },
  selectedTab: "details"
}

export const invoiceHeading = `${invoicePanelState.invoice.number}: ${invoiceQueryCache.invoice.totalCents}`
