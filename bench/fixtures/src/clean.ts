// Benchmark fixture: idiomatic code that should produce zero (or near-zero) matches.
// Measures each rule's baseline traversal cost on code it has nothing to say about —
// on real projects most files look like this, so this dominates real-world rule cost.

import { Struct } from "effect"

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

const isPaid = (order: Order) => order.status === "paid"

const addOrderAmountCents = (total: number, order: Order) => total + order.amountCents

export const totalPaidCents = (orders: ReadonlyArray<Order>) =>
  orders.filter(isPaid).reduce(addOrderAmountCents, 0)

const orderLabel = (order: Order) => `${order.id}: ${(order.amountCents / 100).toFixed(2)}`

export const orderLabels = (orders: ReadonlyArray<Order>): ReadonlyArray<string> =>
  orders.map(orderLabel)

export const parseOrderPayload = (raw: string): unknown => JSON.parse(raw)

export const isOpen = (order: Order) => order.status === "open"

export const statusRank = (order: Order): number =>
  order.status === "open" ? 0 : order.status === "paid" ? 1 : 2

export const lineTotalCents = (line: OrderLine) => line.quantity * line.unitPriceCents

const addLineTotalCents = (total: number, line: OrderLine) => total + lineTotalCents(line)

export const computedAmountCents = (order: Order) => order.lines.reduce(addLineTotalCents, 0)

const lineSku = Struct.get<OrderLine, "sku">("sku")

export const skusForOrder = (order: Order): ReadonlyArray<string> => order.lines.map(lineSku)

export const distinctSkus = (orders: ReadonlyArray<Order>): ReadonlyArray<string> => {
  const allSkus = orders.flatMap(skusForOrder)

  return [...new Set(allSkus)]
}

const largerOrder = (largest: Order | null, order: Order): Order | null =>
  largest === null || order.amountCents > largest.amountCents ? order : largest

export const largestOrder = (orders: ReadonlyArray<Order>) =>
  orders.reduce<Order | null>(largerOrder, null)

export const formatStatus = (order: Order) =>
  order.status === "cancelled" ? `${order.id} (cancelled)` : order.id

const hasStatus =
  (status: Order["status"]) =>
  (order: Order): boolean =>
    order.status === status

export const ordersByStatus = (
  orders: ReadonlyArray<Order>,
  status: Order["status"]
): ReadonlyArray<Order> => orders.filter(hasStatus(status))

export const averageAmountCents = (orders: ReadonlyArray<Order>) => {
  if (orders.length === 0) {
    return 0
  }

  const paidCents = totalPaidCents(orders)

  return Math.round(paidCents / orders.length)
}
