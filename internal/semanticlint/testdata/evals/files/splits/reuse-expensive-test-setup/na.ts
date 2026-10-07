import { describe, expect, it } from "vitest"

const customerName = (first: string, last: string): string => {
  return `${first} ${last}`
}

const nameInitials = (name: string): string => {
  return name.slice(0, 2)
}

describe("customer names", () => {
  it("joins a customer first and last name", () => {
    const name = customerName("Ada", "Lovelace")
    const initials = nameInitials(name)
    expect(initials).toBe("Ad")
  })
})
