import { Context, Effect, Layer, Ref } from "effect"
import { readFileSync } from "node:fs"
import { PaymentClient, createClient } from "@acme/sdk"

export class PaymentPort extends Context.Tag("PaymentPort")<
  PaymentPort,
  { readonly charge: (amount: number) => Effect.Effect<string> }
>() {}

class RuntimeState extends Context.Tag("RuntimeState")<
  RuntimeState,
  Ref.Ref<number>
>() {}

export const eagerRead = Effect.succeed(readFileSync("config.json", "utf8"))

export const suspendedRead = Effect.sync(() =>
  readFileSync("config.json", "utf8")
)

export const suspendedRequest = Effect.tryPromise({
  try: () => fetch("https://example.com"),
  catch: (error) => error
})

export const makeUnscopedClient = Effect.sync(() => new PaymentClient())

const acquire = Effect.sync(() => createClient())
const release = (client: PaymentClient): Effect.Effect<void> =>
  Effect.sync(() => client.close())

const standaloneAcquire = Effect.sync(() => createClient())
export const managedClient = Effect.acquireRelease(standaloneAcquire, release)

export const paymentLive = Layer.scoped(
  PaymentPort,
  Effect.map(Effect.acquireRelease(acquire, release), (client) => ({
    charge: (amount: number) => Effect.promise(() => client.charge(amount))
  }))
)

export const eagerScopedLive = Layer.scoped(
  PaymentPort,
  Effect.map(Effect.succeed(createClient()), (client) => ({
    charge: (amount: number) => Effect.promise(() => client.charge(amount))
  }))
)

export const scopedStateLive = Layer.scopedDiscard(
  Effect.sync(() => {
    Ref.unsafeMake(0)
  })
)

export const eagerStateLive = Layer.scoped(
  RuntimeState,
  Effect.succeed(Ref.unsafeMake(0))
)
