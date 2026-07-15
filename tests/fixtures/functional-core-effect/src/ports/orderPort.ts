import { Context, Effect } from "effect"

export class OrderPort extends Context.Service<
  OrderPort,
  {
    readonly load: (id: string) => Effect.Effect<string>
    readonly save: (value: string) => Effect.Effect<void>
  }
>()("OrderPort") {}
