type Order = {
  readonly reference: string
  readonly amount: number
}

const readOrder = async (input: Request): Promise<Order> => {
  const value = await input.json() as Order
  return { reference: value.reference, amount: value.amount }
}

const persist = async (order: Order): Promise<string> =>
  `${order.reference}:${order.amount}`

export const receiveOrder = async (input: Request): Promise<string> => {
  const order = await input.json() as Order
  const parsed = order
  return persist(parsed)
}
