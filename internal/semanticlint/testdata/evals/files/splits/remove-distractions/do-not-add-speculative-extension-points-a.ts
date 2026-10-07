export type Receipt = {
  readonly id: string;
};

type ReceiptOptions = {
  readonly onSaved?: (receipt: Receipt) => void;
};

export const saveReceipt = (receipt: Receipt, options: ReceiptOptions = {}): Receipt => {
  options.onSaved?.(receipt);
  return receipt;
};

export const createReceipt = (id: string): Receipt => ({
  id,
});

export const receiptId = (receipt: Receipt): string => receipt.id;
