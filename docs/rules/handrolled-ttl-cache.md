# handrolled-ttl-cache

## What it does

Reports a native `Map` only when the same map and key store an object property derived from `Date.now()`, read that entry, compare that same property with `Date.now()`, and delete that same key in the expiration branch.

The report says: “Avoid a hand-rolled TTL Map cache when Effect Cache fits. Use Cache.make or Cache.makeWith only after choosing absolute or idle expiry, failure retention, and cancellation semantics.”

## When to use it

`Cache` expiry is not a drop-in replacement. Decide whether expiry is absolute, access-based, or idle-based, and whether failures and interrupted lookups should remain entries.

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
const entries = new Map<string, { value: string; expiresAt: number }>()

function lookup(key: string): string {
  const entry = entries.get(key)
  if (entry !== undefined && entry.expiresAt < Date.now()) entries.delete(key)
  const value = key.toUpperCase()
  entries.set(key, { value, expiresAt: Date.now() + 1_000 })
  return value
}
```
