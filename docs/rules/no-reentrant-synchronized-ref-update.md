# no-reentrant-synchronized-ref-update

## What it does

Reports a directly returned mutation, or an immediately yielded mutation in an `Effect.gen` callback, that reacquires the same resolved `SynchronizedRef` or `SubscriptionRef` lock from an effectful update callback (`getAndUpdateEffect`, `modifyEffect`, `updateAndGetEffect`, or `updateEffect`). Reads, different refs, and mutations constructed inside an unexecuted lazy callback are allowed.

## When to use it

An effectful update holds the ref's permit until its callback finishes. Compute the next state in that callback and let the outer update store it.

## Conformant

```ts
import { Effect, SynchronizedRef } from "effect"

declare const ref: SynchronizedRef.SynchronizedRef<number>
const program = SynchronizedRef.updateEffect(ref, (value) => Effect.succeed(value + 1))
```

## Non-conformant

```ts
import { SynchronizedRef } from "effect"

declare const ref: SynchronizedRef.SynchronizedRef<number>
const program = SynchronizedRef.updateEffect(ref, (value) =>
  SynchronizedRef.modify(ref, (next) => [value, next] as const)
)
```
