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

const isPaid = (order: Order): boolean => order.status === "paid"

const addOrderAmountCents = (total: number, order: Order): number => total + order.amountCents

export const totalPaidCents = (orders: ReadonlyArray<Order>): number =>
  orders.filter(isPaid).reduce(addOrderAmountCents, 0)

const orderLabel = (order: Order): string =>
  `${order.id}: ${(order.amountCents / 100).toFixed(2)}`

export const orderLabels = (orders: ReadonlyArray<Order>): ReadonlyArray<string> =>
  orders.map(orderLabel)

export const isOpen = (order: Order): boolean => order.status === "open"

export const statusRank = (order: Order): number =>
  order.status === "open" ? 0 : order.status === "paid" ? 1 : 2

export const lineTotalCents = (line: OrderLine): number => line.quantity * line.unitPriceCents

const addLineTotalCents = (total: number, line: OrderLine): number => total + lineTotalCents(line)

export const computedAmountCents = (order: Order): number =>
  order.lines.reduce(addLineTotalCents, 0)

const lineSku = (line: OrderLine): string => line.sku

export const skusForOrder = (order: Order): ReadonlyArray<string> => order.lines.map(lineSku)

export const distinctSkus = (orders: ReadonlyArray<Order>): ReadonlyArray<string> => [
  ...new Set(orders.flatMap(skusForOrder))
]

const largerOrder = (largest: Order | null, order: Order): Order | null =>
  largest === null || order.amountCents > largest.amountCents ? order : largest

export const largestOrder = (orders: ReadonlyArray<Order>): Order | null =>
  orders.reduce<Order | null>(largerOrder, null)

export const formatStatus = (order: Order): string =>
  order.status === "cancelled" ? `${order.id} (cancelled)` : order.id

const hasStatus = (status: Order["status"]) => (order: Order): boolean => order.status === status

export const ordersByStatus = (
  orders: ReadonlyArray<Order>,
  status: Order["status"]
): ReadonlyArray<Order> => orders.filter(hasStatus(status))

export const averageAmountCents = (orders: ReadonlyArray<Order>): number =>
  orders.length === 0 ? 0 : Math.round(totalPaidCents(orders) / orders.length)
