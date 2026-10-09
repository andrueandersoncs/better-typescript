import type { Invoice, LineItem } from "./types"

export interface InvoiceSummary {
  readonly invoiceId: string
  readonly subtotalCents: number
  readonly taxCents: number
  readonly total: number
}

const TAX_RATE = 0.0825

export function lineAmountCents(item: LineItem): number {
  return item.unitPriceCents * item.quantity
}

export function summarizeInvoice(invoice: Invoice): InvoiceSummary {
  const subtotalCents = invoice.items.reduce((sum, item) => sum + lineAmountCents(item), 0)
  const taxCents = Math.round(subtotalCents * TAX_RATE)

  return {
    invoiceId: invoice.id,
    subtotalCents,
    taxCents,
    total: subtotalCents + taxCents,
  }
}

export function formatSummary(summary: InvoiceSummary): string {
  return `Invoice ${summary.invoiceId}: $${(summary.total / 100).toFixed(2)}`
}
