import type { Order, OrderLine } from "./order.js"
import { formatMoney } from "./money.js"

export interface ReceiptLine {
  readonly label: string
  readonly amount: string
}

const lineTotalCents = (line: OrderLine): number => line.unitCents * line.quantity

export const receiptLines = (order: Order): ReadonlyArray<ReceiptLine> => {
  const subtotalCents = order.lines.reduce((sum, line) => sum + lineTotalCents(line), 0)
  const taxCents = Math.round(subtotalCents * order.taxRate)
  const lines: Array<ReceiptLine> = order.lines.map((line) => ({
    label: `${line.quantity} × ${line.name}`,
    amount: formatMoney(lineTotalCents(line), order.currency)
  }))
  lines.push({ label: "Tax", amount: formatMoney(taxCents, order.currency) })
  lines.push({ label: "Total", amount: formatMoney(subtotalCents + taxCents, order.currency) })
  return lines
}

export const receiptHeader = (order: Order): string => {
  const customerEmail = order.customer.email
  return `Receipt ${order.number} for ${customerEmail}`
}
