import { Context, Effect, Layer, Ref } from "effect"
import { readFileSync } from "node:fs"
import { PaymentClient, createClient } from "@acme/sdk"

export class PaymentPort extends Context.Service<
  PaymentPort,
  { readonly charge: (amount: number) => Effect.Effect<string> }
>()("PaymentPort") {}

class RuntimeState extends Context.Service<
  RuntimeState,
  Ref.Ref<number>
>()("RuntimeState") {}

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

export const paymentLive = Layer.effect(
  PaymentPort,
  Effect.map(Effect.acquireRelease(acquire, release), (client) => ({
    charge: (amount: number) => Effect.promise(() => client.charge(amount))
  }))
)

export const eagerScopedLive = Layer.effect(
  PaymentPort,
  Effect.map(Effect.succeed(createClient()), (client) => ({
    charge: (amount: number) => Effect.promise(() => client.charge(amount))
  }))
)

export const scopedStateLive = Layer.effectDiscard(
  Effect.sync(() => {
    Ref.makeUnsafe(0)
  })
)

export const eagerStateLive = Layer.effect(
  RuntimeState,
  Effect.succeed(Ref.makeUnsafe(0))
)

export const unsafelyLayeredClient = Layer.effect(
  PaymentPort,
  Effect.map(Effect.sync(() => createClient()), (client) => ({
    charge: (amount: number) => Effect.promise(() => client.charge(amount))
  }))
)

export const disposableClient = Effect.acquireDisposable(
  Effect.sync(() => ({
    [Symbol.dispose]: () => undefined,
    charge: (amount: number) => Promise.resolve(String(amount)),
    close: () => undefined
  }))
)
