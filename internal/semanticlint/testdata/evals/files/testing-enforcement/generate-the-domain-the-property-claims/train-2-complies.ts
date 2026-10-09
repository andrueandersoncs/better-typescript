import { describe, expect, test } from "vitest"
import fc from "fast-check"
import { formatCents, parseCents } from "../src/money"

const cents = fc.integer({ min: 0, max: 10_000_000 })

describe("money formatting", () => {
  test("formats whole dollars with two decimals", () => {
    expect(formatCents(1200)).toBe("$12.00")
  })

  test("round-trips every integer amount, including refunds and zero", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10_000_000, max: 10_000_000 }), (amount) => {
        expect(parseCents(formatCents(amount))).toBe(amount)
      }),
    )
  })

  test("never emits more than two fractional digits", () => {
    fc.assert(
      fc.property(cents, (amount) => {
        const [, fraction = ""] = formatCents(amount).split(".")
        expect(fraction.length).toBeLessThanOrEqual(2)
      }),
    )
  })

  test("rejects text without a currency symbol", () => {
    expect(() => parseCents("12.00")).toThrow()
  })
})
