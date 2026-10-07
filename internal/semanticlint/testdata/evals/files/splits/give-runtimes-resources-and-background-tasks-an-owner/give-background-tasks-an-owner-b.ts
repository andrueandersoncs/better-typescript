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

const observeReceiptDelivery = (receipt: Receipt): Effect.Effect<void> =>
  Effect.catchAll(
    receiptGateway.deliver(receipt),
    (failure) => Effect.logError(failure),
  )

export const deliverReceiptInBackground = (receipt: Receipt) =>
  Effect.asVoid(Effect.forkScoped(observeReceiptDelivery(receipt)))

export const receiptId = (receipt: Receipt): string => receipt.id

export const receiptReference = (receipt: Receipt): string => `receipt-${receipt.id}`
