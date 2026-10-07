export type Receipt = {
  readonly customerId: string
  readonly totalCents: number
}

export interface ReceiptSender {
  sendReceipt: (receipt: Receipt) => Promise<void>
}

export const deliverReceipt = async (
  sender: ReceiptSender,
  receipt: Receipt,
): Promise<void> => {
  await sender.sendReceipt(receipt)
}
