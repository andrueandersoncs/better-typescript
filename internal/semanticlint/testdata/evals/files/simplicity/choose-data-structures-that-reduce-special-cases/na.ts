type LineItem = {
  description: string
  quantity: number
  unitPrice: number
}

export function subtotal(items: ReadonlyArray<LineItem>): number {
  return items.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
}

export function receiptLines(items: ReadonlyArray<LineItem>): ReadonlyArray<string> {
  return items.map((item) => {
    const amount = item.quantity * item.unitPrice
    return `${item.quantity} × ${item.description}: $${amount.toFixed(2)}`
  })
}
