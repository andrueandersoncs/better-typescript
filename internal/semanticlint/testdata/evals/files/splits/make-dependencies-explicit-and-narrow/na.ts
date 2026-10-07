export type InvoiceId = string

export type InvoiceLine = Readonly<{
  description: string
  amountCents: number
}>

export type InvoiceSummary = Readonly<{
  invoiceId: InvoiceId
  lines: readonly InvoiceLine[]
  totalCents: number
}>

export type InvoiceStatus = "draft" | "issued"

export type InvoiceRecord = Readonly<{
  status: InvoiceStatus
  summary: InvoiceSummary
}>
