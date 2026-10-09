export interface Coupon {
  readonly code: string
  readonly percentOff: number
  readonly expiresAt: Date
  readonly minimumSubtotalCents: number
}

export interface CartLine {
  readonly sku: string
  readonly unitPriceCents: number
  readonly quantity: number
}

export class CouponRejected extends Error {
  constructor(readonly code: string, readonly reason: "expired" | "below_minimum") {
    super(`Coupon ${code} rejected: ${reason}`)
  }
}

export function subtotalCents(lines: ReadonlyArray<CartLine>): number {
  return lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
}

export function applyCoupon(coupon: Coupon, lines: ReadonlyArray<CartLine>, now: Date): number {
  const subtotal = subtotalCents(lines)
  if (coupon.expiresAt.getTime() <= now.getTime()) {
    throw new CouponRejected(coupon.code, "expired")
  }
  if (subtotal < coupon.minimumSubtotalCents) {
    throw new CouponRejected(coupon.code, "below_minimum")
  }
  const discount = Math.round((subtotal * coupon.percentOff) / 100)
  return subtotal - discount
}
