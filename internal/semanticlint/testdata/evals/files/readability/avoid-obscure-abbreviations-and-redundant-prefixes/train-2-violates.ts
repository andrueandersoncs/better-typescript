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

export function applyCoupon(cpnCoupon: Coupon, lines: ReadonlyArray<CartLine>, now: Date): number {
  const subtotal = subtotalCents(lines)
  if (cpnCoupon.expiresAt.getTime() <= now.getTime()) {
    throw new CouponRejected(cpnCoupon.code, "expired")
  }
  if (subtotal < cpnCoupon.minimumSubtotalCents) {
    throw new CouponRejected(cpnCoupon.code, "below_minimum")
  }
  const discount = Math.round((subtotal * cpnCoupon.percentOff) / 100)
  return subtotal - discount
}
