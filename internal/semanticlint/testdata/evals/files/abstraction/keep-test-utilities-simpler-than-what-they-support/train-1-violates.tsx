import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CartSummary } from "../CartSummary"
import type { Cart, CartLine } from "../types"

const buildCart = (lines: ReadonlyArray<Partial<CartLine>>, couponCode?: string): Cart => {
  const full = lines.map((line, index) => ({
    sku: line.sku ?? `sku-${index}`,
    quantity: line.quantity ?? 1,
    unitPriceCents: line.unitPriceCents ?? 1000,
    taxable: line.taxable ?? true,
  }))
  const subtotal = full.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0)
  const discount = couponCode === "HALF" ? Math.floor(subtotal / 2) : couponCode === "TEN" ? 1000 : 0
  const taxableBase = full
    .filter((l) => l.taxable)
    .reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0)
  const tax = Math.round(Math.max(0, taxableBase - discount) * 0.0825)
  return {
    lines: full,
    couponCode: couponCode ?? null,
    subtotalCents: subtotal,
    discountCents: discount,
    taxCents: tax,
    totalCents: subtotal - discount + tax,
  }
}

describe("CartSummary", () => {
  it("shows the order total", () => {
    render(<CartSummary cart={buildCart([{ quantity: 2, unitPriceCents: 1500 }])} />)
    expect(screen.getByTestId("cart-total")).toHaveTextContent("$32.48")
  })
})
