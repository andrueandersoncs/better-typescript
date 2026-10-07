import { describe, expect, it } from "vitest"
import { parseCurrency } from "../src/parseCurrency"

describe("parseCurrency", () => {
  it("keeps the currency code uppercased", () => {
    const amount = {
      code: "usd",
      minorUnits: 1250
    }

    expect(parseCurrency(amount)).toEqual({ code: "USD", minorUnits: 1250 })
  })
})
