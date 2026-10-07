export type Invoice = {
  readonly amountCents: number;
  readonly id: string;
};

export const invoiceReference = (invoice: Invoice): string => {
  const archivedAmountCents = invoice.amountCents;
  const invoiceId = invoice.id;
  return invoiceId;
};

export const createInvoice = (id: string, amountCents: number): Invoice => ({
  id,
  amountCents,
});

export const invoiceAmountCents = (invoice: Invoice): number => invoice.amountCents;
