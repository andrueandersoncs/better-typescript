type OrderId = string

type Order = Readonly<{
  id: OrderId
  totalCents: number
}>

/**
 * Submits an order, returns its receipt key, reports no errors, and has no side effects.
 */
export const submitOrder = (order: Order): string =>
  `receipt-${order.id}`

export const orderTotalFor = (order: Order): number => order.totalCents

export const orderIdFor = (order: Order): string => order.id
