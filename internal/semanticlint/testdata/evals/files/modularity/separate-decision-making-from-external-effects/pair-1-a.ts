type Order = { id: string; total: number; customerId: string }

type Discount = { customerId: string; percentage: number }

export async function invoiceOrder(orderId: string) {
  const order = await orders.find(orderId)
  const discount = await discounts.forCustomer(order.customerId)
  const percentage = discount?.percentage ?? 0
  const discountedTotal = order.total * (1 - percentage / 100)

  if (discountedTotal >= 500) {
    await ledger.record(order.id, discountedTotal, "manager-review")
    await mailer.send(order.customerId, "Your invoice needs review")
    return { total: discountedTotal, requiresReview: true }
  }

  await ledger.record(order.id, discountedTotal, "approved")
  return { total: discountedTotal, requiresReview: false }
}

declare const orders: { find(id: string): Promise<Order> }
declare const discounts: { forCustomer(id: string): Promise<Discount | undefined> }
declare const ledger: { record(id: string, total: number, state: string): Promise<void> }
declare const mailer: { send(customerId: string, text: string): Promise<void> }
