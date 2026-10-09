import type { Cart, CartLine } from "./cart";

export interface ShippingQuote {
  readonly baseCents: number;
  readonly discountCents: number;
  readonly totalCents: number;
}

const BASE_SHIPPING_CENTS = 799;
const PER_ITEM_SHIPPING_CENTS = 150;
const FREE_SHIPPING_THRESHOLD_CENTS = 7500;

const subtotalCents = (lines: ReadonlyArray<CartLine>): number =>
  lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);

export function quoteShipping(cart: Cart): ShippingQuote {
  if (cart.lines.length === 0) {
    return { baseCents: 0, discountCents: 0, totalCents: 0 };
  }

  const itemCount = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  const baseCents = BASE_SHIPPING_CENTS + PER_ITEM_SHIPPING_CENTS * (itemCount - 1);
  const discountCents = subtotalCents(cart.lines) >= FREE_SHIPPING_THRESHOLD_CENTS ? baseCents : 0;

  return { baseCents, discountCents, totalCents: baseCents - discountCents };
}
