import { Context, Effect, Layer, Ref } from "effect"
import type { PaymentClient } from "@acme/sdk"

export class LeakyPort extends Context.Service<
  LeakyPort,
  {
    readonly request: () => Promise<string>
    readonly state: Ref.Ref<number>
    readonly client: PaymentClient
    readonly context: Context.Context<never>
  }
>()("LeakyPort") {}

export class DefaultPort extends Context.Service<DefaultPort>()("DefaultPort", {
  make: Effect.succeed({
    read: () => "value"
  })
}) {
  static readonly layer = Layer.effect(DefaultPort, DefaultPort.make).pipe(
    Layer.provide(Layer.empty)
  )
}

export class SimplePort extends Context.Service<
  SimplePort,
  { readonly read: Effect.Effect<string> }
>()("SimplePort") {}

export const simpleLive = Layer.succeed(SimplePort, {
  read: Effect.succeed("value")
})

type AliasedClientContract = { readonly client: PaymentClient }

export class AliasedClientPort extends Context.Service<
  AliasedClientPort,
  AliasedClientContract
>()("AliasedClientPort") {}

type AliasedContextContract = Context.Context<never>

export class AliasedContextPort extends Context.Service<
  AliasedContextPort,
  AliasedContextContract
>()("AliasedContextPort") {}

interface FunctionLivePort {
  readonly read: () => string
}

export const FunctionLivePort = Context.Service<FunctionLivePort>()("FunctionLivePort", {
  make: Effect.succeed({
    read: () => "function-live"
  })
})
