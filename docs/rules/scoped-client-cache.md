# scoped-client-cache

## What it does

Reports a known `Effect.acquireRelease` resource acquisition when it is executed by a resolved ordinary `Cache.make` `lookup`, `Cache.makeWith` first callback, or immediate `Effect.gen` lookup body. Context provision and an `Effect.succeed` payload are not acquisition. `ScopedCache` entry scopes and `RcMap` borrower scopes are different ownership models and are allowed.

The report says: “Do not acquire a scoped resource inside an ordinary Cache lookup. Acquire the resource in its owning layer and let lookup use the shared client.”

## When to use it

Use it when an ordinary Cache lookup repeatedly creates a scoped client or resource. Acquire that resource at the layer or application owner, then have lookup use the shared client.

## Conformant

```ts
import { Cache, Effect } from "effect"

declare const client: { readonly lookup: (key: string) => string }

const cache = Cache.make({
  capacity: 100,
  timeToLive: "1 minute",
  lookup: (key: string) => Effect.sync(() => client.lookup(key))
})
```

## Non-conformant

```ts
import { Cache, Effect } from "effect"

interface Client { readonly id: string }
declare const acquireClient: (key: string) => Effect.Effect<Client>

const cache = Cache.make({
  capacity: 100,
  timeToLive: "1 minute",
  lookup: (key: string) =>
    Effect.acquireRelease(acquireClient(key), () => Effect.void)
})
```
