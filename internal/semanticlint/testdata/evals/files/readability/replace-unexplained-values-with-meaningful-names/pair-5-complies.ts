type Item = {
  readonly unitPrice: number
  readonly quantity: number
}

const invoiceTaxMultiplier = 1.2

export const invoiceTotal = (items: ReadonlyArray<Item>): number =>
  items.reduce((total, item) => total + item.unitPrice * item.quantity * invoiceTaxMultiplier, 0)

export const invoiceCount = (items: ReadonlyArray<Item>): number => {
  if (items.length === 0) {
    return 0
  }
  return items.length
}

export const hasInvoices = (items: ReadonlyArray<Item>): boolean => items.length > 0
