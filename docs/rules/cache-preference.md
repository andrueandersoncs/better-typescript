# cache-preference

## What it does

Reports a native `Map` only when one local execution owner uses the same map and key to get a value, return that value on a direct hit guard, compute a replacement from that key, and set it. TTL entry protocols and running-Promise protocols belong to `handrolled-ttl-cache` and `inflight-dedupe-map`; cold `Effect` registries are allowed.

Bare returns are ignored because they cannot return a cached value.

The report says: “Prefer Effect Cache for a hand-rolled value-cache protocol when its lifecycle fits. Use Cache.make or Cache.makeWith after choosing key equality, ownership, failure, and retention semantics.”

## When to use it

Use this recommendation only when `Cache` can own the intended value lifetime. A native map can still be appropriate for synchronous memoization or protocol-local object-identity caching.

## Conformant

```ts
import { Cache, Effect } from "effect"

const cache = Cache.make({
  capacity: 100,
  timeToLive: "1 minute",
  lookup: (key: string) => Effect.succeed(key)
})
```

## Non-conformant

```ts
const values = new Map<string, string>()

function load(key: string): string { return key.toUpperCase() }
function lookup(key: string): string {
  const cached = values.get(key)
  if (cached !== undefined) return cached
  const fresh = load(key)
  values.set(key, fresh)
  return fresh
}
```
