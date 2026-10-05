import * as Context from "effect/Context"
import * as Effect from "effect/Effect"

type Coordinates = { readonly latitude: number; readonly longitude: number }

interface MapGateway {
  readonly locate: (postalCode: string) => Effect.Effect<Coordinates>
}

export const DeliveryMap = Context.Service<{
  readonly locate: (postalCode: string) => Effect.Effect<Coordinates, Error, MapGateway>
}>("DeliveryMap")
