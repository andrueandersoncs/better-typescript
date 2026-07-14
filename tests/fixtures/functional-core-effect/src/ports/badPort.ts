import { Context, Effect, Layer, Ref } from "effect"
import type { PaymentClient } from "@acme/sdk"

export class LeakyPort extends Context.Tag("LeakyPort")<
  LeakyPort,
  {
    readonly request: () => Promise<string>
    readonly state: Ref.Ref<number>
    readonly client: PaymentClient
    readonly context: Context.Context<never>
  }
>() {}

export class DefaultPort extends Effect.Service<DefaultPort>()("DefaultPort", {
  dependencies: [Layer.empty],
  succeed: {
    read: () => "value"
  }
}) {}

export class SimplePort extends Context.Tag("SimplePort")<
  SimplePort,
  { readonly read: Effect.Effect<string> }
>() {}

export const simpleLive = Layer.succeed(SimplePort, {
  read: Effect.succeed("value")
})

type AliasedClientContract = { readonly client: PaymentClient }

export class AliasedClientPort extends Context.Tag("AliasedClientPort")<
  AliasedClientPort,
  AliasedClientContract
>() {}

type AliasedContextContract = Context.Context<never>

export class AliasedContextPort extends Context.Tag("AliasedContextPort")<
  AliasedContextPort,
  AliasedContextContract
>() {}
