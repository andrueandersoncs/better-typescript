export type InvoiceLine = {
  readonly unitPriceCents: number;
  readonly quantity: number;
};

const calculateLineTotal = (line: InvoiceLine): number => {
  const quantityTotal = line.unitPriceCents * line.quantity;
  return quantityTotal;
};

export const calculateInvoiceTotal = (
  lines: ReadonlyArray<InvoiceLine>,
): number => {
  const lineTotals = lines.map(calculateLineTotal);
  return lineTotals.reduce(addAmounts, 0);
};

const addAmounts = (total: number, amount: number): number => total + amount;
