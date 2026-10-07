type Invoice = {
  invoiceId: string;
  totalCents: number;
  paidCents: number;
};

export const remainingBalance = (invoice: Invoice): number => {
  return invoice.totalCents - invoice.paidCents;
};

export const paymentUrl = (invoice: Invoice): string => {
  return `/invoices/${invoice.invoiceId}/pay`;
};
