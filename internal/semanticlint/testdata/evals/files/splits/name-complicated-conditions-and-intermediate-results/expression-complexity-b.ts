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
  const discountedSubtotalCents = applyDiscount(cart.subtotalCents, cart.discountCents);
  const totalWithTaxCents = addTax(discountedSubtotalCents, cart.taxRate);
  return Math.round(totalWithTaxCents);
};
