import { describe, expect, it } from "vitest"
import { totalForCart } from "../src/totalForCart"

describe("totalForCart", () => {
  it("includes every line item", () => {
    const cart = {
      currency: "USD",
      items: [
        { unitPrice: 1200, quantity: 2 },
        { unitPrice: 350, quantity: 3 }
      ]
    }
    const expected = totalForCart(cart)

    expect(totalForCart(cart)).toEqual(expected)
  })
})
