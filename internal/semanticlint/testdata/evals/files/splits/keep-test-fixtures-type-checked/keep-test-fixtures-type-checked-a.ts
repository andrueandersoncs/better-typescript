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
    const customer =
      { id: "cust-1", creditLimit: 0, displayName: "Ava" } as unknown as Customer
    const credit = remainingCredit(customer)
    expect(credit).toBe(0)
  })
})
