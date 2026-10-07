export type EditableInvoice = {
  invoiceId: string;
  customerName: string;
  dueDate: Date;
  sentAt: Date | undefined;
};

export const markInvoiceSent = (invoice: EditableInvoice, sentAt: Date): void => {
  invoice.sentAt = sentAt;
};

export const changeDueDate = (invoice: EditableInvoice, dueDate: Date): void => {
  invoice.dueDate = dueDate;
};
