// Benchmark fixture: idiomatic code that should produce zero (or near-zero) matches.
// Measures each rule's baseline traversal cost on code it has nothing to say about —
// on real projects most files look like this, so this dominates real-world rule cost.

interface Order {
  readonly id: string
  readonly amountCents: number
  readonly status: "open" | "paid" | "cancelled"
  readonly lines: ReadonlyArray<OrderLine>
}

interface OrderLine {
  readonly sku: string
  readonly quantity: number
  readonly unitPriceCents: number
}

export const totalPaidCents = (orders: ReadonlyArray<Order>): number =>
  orders
    .filter((order) => order.status === "paid")
    .reduce((total, order) => total + order.amountCents, 0)

export const orderLabels = (orders: ReadonlyArray<Order>): ReadonlyArray<string> =>
  orders.map((order) => `${order.id}: ${(order.amountCents / 100).toFixed(2)}`)

export const isOpen = (order: Order): boolean => order.status === "open"

export const statusRank = (order: Order): number =>
  order.status === "open" ? 0 : order.status === "paid" ? 1 : 2

export const lineTotalCents = (line: OrderLine): number => line.quantity * line.unitPriceCents

export const computedAmountCents = (order: Order): number =>
  order.lines.reduce((total, line) => total + lineTotalCents(line), 0)

export const skusForOrder = (order: Order): ReadonlyArray<string> =>
  order.lines.map((line) => line.sku)

export const distinctSkus = (orders: ReadonlyArray<Order>): ReadonlyArray<string> => [
  ...new Set(orders.flatMap(skusForOrder))
]

export const largestOrder = (orders: ReadonlyArray<Order>): Order | null =>
  orders.reduce<Order | null>(
    (largest, order) =>
      largest === null || order.amountCents > largest.amountCents ? order : largest,
    null
  )

export const formatStatus = (order: Order): string =>
  order.status === "cancelled" ? `${order.id} (cancelled)` : order.id

export const ordersByStatus = (
  orders: ReadonlyArray<Order>,
  status: Order["status"]
): ReadonlyArray<Order> => orders.filter((order) => order.status === status)

export const averageAmountCents = (orders: ReadonlyArray<Order>): number =>
  orders.length === 0 ? 0 : Math.round(totalPaidCents(orders) / orders.length)
