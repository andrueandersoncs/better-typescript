# inflight-dedupe-map

## What it does

Reports a native `Map` only when the same map and key get a previously started native `Promise`, return it on a direct hit guard, and set a new Promise for the miss. A map of cold `Effect` values, a Promise key, a Promise map without this get-or-start protocol, and bare returns are allowed.

The report says: “Avoid a hand-rolled in-flight Promise Map when Effect Cache fits. Cache.get shares a missing-key lookup; choose its cancellation and failure-retention semantics deliberately.”

## When to use it

Effect Cache shares a missing-key lookup, but it also defines failure retention and final-consumer cancellation. Choose it only when those ownership semantics match the protocol.

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
const pending = new Map<string, Promise<string>>()

function getOrStart(key: string): Promise<string> {
  const existing = pending.get(key)
  if (existing !== undefined) return existing
  const running = Promise.resolve(key.toUpperCase())
  pending.set(key, running)
  return running
}
```
