import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CartSummary } from "../CartSummary"
import type { Cart, CartLine } from "../types"

const buildCart = (overrides: Partial<Cart> = {}): Cart => ({
  lines: [{ sku: "sku-0", quantity: 2, unitPriceCents: 1500, taxable: true }],
  couponCode: null,
  subtotalCents: 3000,
  discountCents: 0,
  taxCents: 248,
  totalCents: 3248,
  ...overrides,
})

describe("CartSummary", () => {
  it("shows the order total", () => {
    render(<CartSummary cart={buildCart()} />)
    expect(screen.getByTestId("cart-total")).toHaveTextContent("$32.48")
  })
})
