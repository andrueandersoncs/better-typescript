import { Effect, Layer } from "effect"
import { OrderPort } from "../ports/orderPort.js"

export const orderLive = Layer.succeed(OrderPort, {
  load: (id: string) => Effect.succeed(id),
  save: () => Effect.void
})
