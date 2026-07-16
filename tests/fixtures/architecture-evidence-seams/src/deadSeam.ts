import { Context, Layer } from "effect"

export class DeadSeam extends Context.Service<
  DeadSeam,
  {
    readonly read: () => string
  }
>()("DeadSeam") {}

export const deadLive = Layer.succeed(DeadSeam, {
  read: () => "dead"
})
