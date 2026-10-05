type Order = {
  readonly id: string
  readonly receivedAt: Date
}

export const recentOrders = (
  orders: ReadonlyArray<Order>,
  offset: number
): ReadonlyArray<Order> => {
  if (orders.length === 0) {
    return []
  }
  return orders
    .toSorted((left, right) => right.receivedAt.getTime() - left.receivedAt.getTime())
    .slice(offset, offset + 25)
}
