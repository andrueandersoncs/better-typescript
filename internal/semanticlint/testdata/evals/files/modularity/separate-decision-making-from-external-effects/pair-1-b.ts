type Order = { id: string; total: number; customerId: string }

type Discount = { customerId: string; percentage: number }

export function decideInvoice(order: Order, discount: Discount | undefined) {
  const percentage = discount?.percentage ?? 0
  const total = order.total * (1 - percentage / 100)
  const requiresReview = total >= 500

  return { total, requiresReview, state: requiresReview ? "manager-review" : "approved" }
}

export async function invoiceOrder(orderId: string) {
  const order = await orders.find(orderId)
  const decision = decideInvoice(order, await discounts.forCustomer(order.customerId))
  await ledger.record(order.id, decision.total, decision.state)

  if (decision.requiresReview) {
    await mailer.send(order.customerId, "Your invoice needs review")
  }

  return decision
}

declare const orders: { find(id: string): Promise<Order> }
declare const discounts: { forCustomer(id: string): Promise<Discount | undefined> }
declare const ledger: { record(id: string, total: number, state: string): Promise<void> }
declare const mailer: { send(customerId: string, text: string): Promise<void> }
