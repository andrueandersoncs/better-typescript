import { describe, expect, it } from "vitest"

type Order = {
  readonly id: string
  readonly amount: number
}

const chargeOrder = (order: Order): string => {
  return `${order.id}:${order.amount}`
}

describe("order charges", () => {
  it("rejects a negative order amount", () => {
    const order: Order = { id: "order-1", amount: -1 }
    const charge = chargeOrder(order)
    expect(charge).toBe("order-1:-1")
  })
})
