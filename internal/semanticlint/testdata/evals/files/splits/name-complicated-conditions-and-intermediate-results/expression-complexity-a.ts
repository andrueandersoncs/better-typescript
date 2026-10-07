export type Cart = {
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly taxRate: number;
};

const applyDiscount = (subtotalCents: number, discountCents: number): number => {
  return subtotalCents - discountCents;
};

const addTax = (amountCents: number, taxRate: number): number => {
  return amountCents + amountCents * taxRate;
};

export const calculateTotalCents = (cart: Cart): number => {
  return Math.round(addTax(applyDiscount(cart.subtotalCents, cart.discountCents), cart.taxRate));
};
