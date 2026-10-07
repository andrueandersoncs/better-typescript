import { expect, test } from "vitest"

const formatAmount = (amount: number) => `$${amount.toFixed(2)}`

test("formats a whole amount", () => {
  expect(formatAmount(12)).toBe("$12.00")
})

test("formats a fractional amount", () => {
  expect(formatAmount(12.5)).toBe("$12.50")
})

test("formats zero", () => {
  expect(formatAmount(0)).toBe("$0.00")
})
