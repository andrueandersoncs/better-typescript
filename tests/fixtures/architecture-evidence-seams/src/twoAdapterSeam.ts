import { Context, Layer } from "effect"

export class TwoAdapterSeam extends Context.Service<
  TwoAdapterSeam,
  {
    readonly read: () => string
  }
>()("TwoAdapterSeam") {}

export const twoAdapterLive = Layer.succeed(TwoAdapterSeam, {
  read: () => "live"
})
