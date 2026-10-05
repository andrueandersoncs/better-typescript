type Order = { readonly code: string; readonly quantity: number }
type Price = { readonly code: string; readonly cents: number }

export const quoteOrders = (
  orders: ReadonlyArray<Order>,
  prices: ReadonlyArray<Price>
): ReadonlyArray<{ readonly code: string; readonly total: number }> => {
  const totals: Array<{ readonly code: string; readonly total: number }> = []
  for (const order of orders) {
    const price = prices.find((candidate) => candidate.code === order.code)
    if (price !== undefined) {
      totals.push({ code: order.code, total: order.quantity * price.cents })
    }
  }
  return totals
}
