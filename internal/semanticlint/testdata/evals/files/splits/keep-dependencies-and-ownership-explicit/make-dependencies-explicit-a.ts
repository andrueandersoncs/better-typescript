export type Receipt = {
  readonly customerId: string
  readonly totalCents: number
}

export interface ReceiptSender {
  sendReceipt: (receipt: Receipt) => Promise<void>
}

declare const sharedReceiptSender: ReceiptSender

export const deliverReceipt = async (receipt: Receipt): Promise<void> => {
  await sharedReceiptSender.sendReceipt(receipt)
}
