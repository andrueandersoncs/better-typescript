# scoped-client-cache

## What it does

Reports selected `Effect` provisioning and `Layer` construction calls nested under imported `Cache.make(...)` or `Cache.makeWith(...)`. The test fixture covers `Effect.provide(...)` inside the `lookup` passed to `Cache.make(...)`.

The report is: `Acquire clients outside Cache lookup functions and share them through a layer. Build the client once in the owning layer, then make lookup a plain call.`

The checked `Effect` methods are `provide`, `provideService`, `provideServiceEffect`, and `provideContext`. The checked `Layer` methods are `build`, `effect`, `effectDiscard`, and `effectContext`. These calls are allowed outside the cache call.

## When to use it

Use it to build a client once in its owning layer instead of acquiring or providing it during cache lookup.

## Conformant

```ts
import { Cache, Effect } from "effect"
declare const clientLayer: unknown
const client = Effect.provide(Effect.succeed("client"), clientLayer)
const cache = Cache.make({
  capacity: 10,
  timeToLive: "1 minute",
  lookup: (key: string) => Effect.succeed(key)
})
```

## Non-conformant

```ts
import { Cache, Effect } from "effect"
declare const clientLayer: unknown
const cache = Cache.make({
  capacity: 10,
  timeToLive: "1 minute",
  lookup: (key: string) => Effect.provide(Effect.succeed(key), clientLayer)
})
```
