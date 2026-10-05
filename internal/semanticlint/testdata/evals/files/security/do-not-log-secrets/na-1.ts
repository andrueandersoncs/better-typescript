type LineItem = {
  readonly sku: string
  readonly quantity: number
  readonly unitPrice: number
}

export const calculateSubtotal = (items: ReadonlyArray<LineItem>): number => {
  return items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0
  )
}
