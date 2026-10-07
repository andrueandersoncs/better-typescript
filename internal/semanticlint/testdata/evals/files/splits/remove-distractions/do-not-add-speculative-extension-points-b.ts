export type Receipt = {
  readonly id: string;
};

export const saveReceipt = (receipt: Receipt): Receipt => {
  return receipt;
};

export const createReceipt = (id: string): Receipt => ({
  id,
});

export const receiptId = (receipt: Receipt): string => receipt.id;

export const receiptLabel = (receipt: Receipt): string => `receipt-${receipt.id}`;
