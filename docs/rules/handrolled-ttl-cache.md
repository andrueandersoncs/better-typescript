# handrolled-ttl-cache

## What it does

Every `new Map` in a file is reported when the file contains a whole-word `expires`, `expiresAt`, `expiresOn`, or `expiresIn` plus the exact substrings `Date.now` and `.delete(`. Even an otherwise ordinary map in that file is reported. The report says: “Avoid a hand-rolled TTL Map cache when Effect Cache fits. Use Cache.make or Cache.makeWith when its lifecycle and eviction semantics fit.”

## When to use it

Use it when Effect Cache can own cache lifecycle and eviction.

## Conformant

```ts
declare const Cache: { make(options: object): unknown }
const cache = Cache.make({})
```

## Non-conformant

```ts
const cache = new Map<string, { expiresAt: number }>()
const expiresAt = Date.now() + 1_000
if (expiresAt < Date.now()) cache.delete("key")
```
