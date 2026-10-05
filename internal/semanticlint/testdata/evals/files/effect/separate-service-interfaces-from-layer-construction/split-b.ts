import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

export const DeliveryMapLive = Layer.effect(DeliveryMap, Effect.gen(function*() {
  const gateway = yield* Context.Service<MapGateway>("MapGateway")
  return {
    locate: (postalCode: string) => gateway.locate(postalCode)
  }
}))
