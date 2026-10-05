import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

type Coordinates = { readonly latitude: number; readonly longitude: number }

interface MapGateway {
  readonly locate: (postalCode: string) => Effect.Effect<Coordinates>
}

export const DeliveryMap = Context.Service<{
  readonly locate: (postalCode: string) => Effect.Effect<Coordinates, Error>
}>("DeliveryMap")

export const DeliveryMapLive = Layer.effect(DeliveryMap, Effect.gen(function*() {
  const gateway = yield* Context.Service<MapGateway>("MapGateway")
  return { locate: (postalCode: string) => gateway.locate(postalCode) }
}))
