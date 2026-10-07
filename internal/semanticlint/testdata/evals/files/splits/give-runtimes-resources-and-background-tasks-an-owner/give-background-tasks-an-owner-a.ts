import * as Effect from "effect/Effect"

type Receipt = {
  readonly id: string
}

class ReceiptDeliveryFailure {
  readonly _tag = "ReceiptDeliveryFailure"
  constructor(readonly cause: unknown) {}
}

type ReceiptGateway = {
  readonly deliver: (receipt: Receipt) => Effect.Effect<void, ReceiptDeliveryFailure>
}

declare const receiptGateway: ReceiptGateway

export const deliverReceiptInBackground = (receipt: Receipt): Effect.Effect<void> =>
  Effect.asVoid(Effect.forkDaemon(receiptGateway.deliver(receipt)))

export const receiptId = (receipt: Receipt): string => receipt.id

export const receiptReference = (receipt: Receipt): string => `receipt-${receipt.id}`
