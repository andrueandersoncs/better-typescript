import { make as makeCache } from "effect/Cache"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as RcMap from "effect/RcMap"
import * as ScopedCache from "effect/ScopedCache"

interface Client { readonly id: string }
interface TenantService { readonly id: string }
declare const acquireClient: (key: string) => Effect.Effect<Client>
declare const Tenant: Context.Tag<TenantService, TenantService>
declare const tenant: TenantService

const pureContext = makeCache({
  lookup: (key: string) => Effect.provideService(Effect.succeed(key), Tenant, tenant)
})

const scopedEntries = ScopedCache.make({
  lookup: (key: string) => Effect.acquireRelease(acquireClient(key), () => Effect.succeed<void>(undefined))
})

const borrowedEntries = RcMap.make({
  lookup: (key: string) => Effect.acquireRelease(acquireClient(key), () => Effect.succeed<void>(undefined))
})

const deferred = makeCache({
  lookup: (key: string) => Effect.succeed(() => Effect.acquireRelease(acquireClient(key), () => Effect.succeed<void>(undefined)))
})

const inert = makeCache({
  lookup: (key: string) => Effect.succeed(Effect.acquireRelease(acquireClient(key), () => Effect.succeed<void>(undefined)))
})

{
  const Cache = {
    make: <A, E, R>(options: { readonly lookup: (key: string) => Effect.Effect<A, E, R> }) => options
  }
  const shadowed = Cache.make({
    lookup: (key: string) => Effect.acquireRelease(acquireClient(key), () => Effect.succeed<void>(undefined))
  })
  void shadowed
}

void pureContext
void scopedEntries
void borrowedEntries
void deferred
void inert
