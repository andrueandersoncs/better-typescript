type LineItem = {
  readonly price: number
  readonly count: number
}

const subtotal = (items: ReadonlyArray<LineItem>): number => {
  return items.reduce((total, item) => total + item.price * item.count, 0)
}

const items: ReadonlyArray<LineItem> = [
  { price: 14, count: 2 },
  { price: 7, count: 3 }
]

export const total = subtotal(items)
