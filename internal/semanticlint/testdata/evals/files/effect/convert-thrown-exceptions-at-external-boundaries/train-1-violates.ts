import { Data, Effect } from "effect"
import Stripe from "stripe"
import { OrderRepository } from "./OrderRepository"

export class CaptureFailed extends Data.TaggedError("CaptureFailed")<{
  readonly orderId: string
  readonly cause: unknown
}> {}

export class OrderNotFound extends Data.TaggedError("OrderNotFound")<{
  readonly orderId: string
}> {}

const toMinorUnits = (amount: number): number => Math.round(amount * 100)

export const captureOrderPayment = (stripe: Stripe, orderId: string) =>
  Effect.gen(function* () {
    const orders = yield* OrderRepository
    const order = yield* orders.findById(orderId)
    if (order === undefined) {
      return yield* new OrderNotFound({ orderId })
    }
    const intent = yield* Effect.promise(() =>
      stripe.paymentIntents.capture(order.paymentIntentId, {
        amount_to_capture: toMinorUnits(order.total),
      }),
    )
    yield* orders.markCaptured(orderId, intent.id)
    return intent.id
  })
