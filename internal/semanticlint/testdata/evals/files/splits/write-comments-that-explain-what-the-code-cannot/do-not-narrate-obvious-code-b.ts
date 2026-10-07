export type Total = {
  readonly subtotalCents: number;
  readonly taxCents: number;
};

export const totalCents = (total: Total): number => {
  return total.subtotalCents + total.taxCents;
};

export const createTotal = (subtotalCents: number, taxCents: number): Total => ({
  subtotalCents,
  taxCents,
});

export const taxCents = (total: Total): number => total.taxCents;
