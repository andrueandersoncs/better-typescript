export type Total = {
  readonly subtotalCents: number;
  readonly taxCents: number;
};

export const totalCents = (total: Total): number => {
  // Add the subtotal and tax amounts.
  return total.subtotalCents + total.taxCents;
};

export const createTotal = (subtotalCents: number, taxCents: number): Total => ({
  subtotalCents,
  taxCents,
});

export const taxCents = (total: Total): number => total.taxCents;
