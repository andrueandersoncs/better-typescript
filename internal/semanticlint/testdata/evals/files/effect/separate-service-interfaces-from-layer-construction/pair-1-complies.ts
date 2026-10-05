import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface CourierApi {
  readonly quote: (zone: string) => Effect.Effect<number>
}

export const Freight = Context.Service<{
  readonly quote: (zone: string) => Effect.Effect<number, Error>
}>("Freight")

export const FreightLive = Layer.effect(Freight, Effect.gen(function*() {
  const courier = yield* Context.Service<CourierApi>("Courier")
  return { quote: (zone: string) => courier.quote(zone) }
}))
