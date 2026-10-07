type OrderId = string

type Order = Readonly<{
  id: OrderId
  totalCents: number
}>

type PreparedOrder = Readonly<{
  order: Order
  receiptKey: string
}>

/**
 * Produces a prepared order from an order, returns its receipt key, reports no errors, and has no side effects.
 */
export const prepareOrder = (order: Order): PreparedOrder => ({
  order,
  receiptKey: `receipt-${order.id}`,
})

/**
 * Submits a prepared order, returns its receipt key, reports no errors, and has no side effects.
 */
export const submitPreparedOrder = (prepared: PreparedOrder): string =>
  prepared.receiptKey

export const orderTotalFor = (order: Order): number => order.totalCents

export const orderIdFor = (order: Order): string => order.id
