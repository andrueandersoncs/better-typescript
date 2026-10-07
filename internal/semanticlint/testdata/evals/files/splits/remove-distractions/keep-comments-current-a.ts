export type Receipt = {
  readonly delivery: "queued" | "sent";
  readonly id: string;
};

// The receipt is sent before this function returns.
export const queueReceipt = (id: string): Receipt => ({
  id,
  delivery: "queued",
});

export const receiptDelivery = (receipt: Receipt): string => {
  return receipt.delivery;
};

export const isReceiptQueued = (receipt: Receipt): boolean => receipt.delivery === "queued";
