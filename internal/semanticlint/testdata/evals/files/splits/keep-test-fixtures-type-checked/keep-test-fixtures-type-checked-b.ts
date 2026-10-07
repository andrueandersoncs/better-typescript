import { describe, expect, it } from "vitest"

type Customer = {
  readonly id: string
  readonly creditLimit: number
}

const remainingCredit = (customer: Customer): number => {
  return customer.creditLimit
}

describe("customer credit", () => {
  it("returns the fixture credit limit", () => {
    const customer: Customer = { id: "cust-1", creditLimit: 0 }
    const credit = remainingCredit(customer)
    expect(credit).toBe(0)
  })
})
