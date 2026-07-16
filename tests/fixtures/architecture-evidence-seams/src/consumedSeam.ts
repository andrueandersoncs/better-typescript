import { Context, Effect, Layer } from "effect"

export class ConsumedSeam extends Context.Service<
  ConsumedSeam,
  {
    readonly read: () => string
  }
>()("ConsumedSeam") {}

export const consumedLive = Layer.succeed(ConsumedSeam, {
  read: () => "consumed"
})

export const useConsumed = Effect.gen(function* () {
  const service = yield* ConsumedSeam
  return service.read()
})

export const providedConsumed = Effect.provideService(useConsumed, ConsumedSeam, {
  read: () => "override"
})
