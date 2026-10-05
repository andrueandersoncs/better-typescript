type Order = { readonly code: string; readonly quantity: number }
type Price = { readonly code: string; readonly cents: number }

export const quoteOrders = (
  orders: ReadonlyArray<Order>,
  prices: ReadonlyArray<Price>
): ReadonlyArray<{ readonly code: string; readonly total: number }> => {
  const pricesByCode = new Map<string, Price>()
  for (const price of prices) {
    if (!pricesByCode.has(price.code)) {
      pricesByCode.set(price.code, price)
    }
  }
  const totals: Array<{ readonly code: string; readonly total: number }> = []
  for (const order of orders) {
    const price = pricesByCode.get(order.code)
    if (price !== undefined) {
      totals.push({ code: order.code, total: order.quantity * price.cents })
    }
  }
  return totals
}
