import { Effect } from "effect"
import { OrderPort } from "../ports/orderPort.js"

export const loadOrder = (
  id: string
): Effect.Effect<string, never, OrderPort> =>
  Effect.gen(function* () {
    const orders = yield* OrderPort
    return yield* orders.load(id)
  })
