# scoped-background-work

## What it does

Reports a resolved `Effect.forkDetach` whose fiber is locally discarded: directly by `Layer.effectDiscard`, by an unused `yield*` in an `Effect.gen` body, or when a generator returns its detached handle to `Layer.effectDiscard`. A cold detached Effect recipe is not a start. A lexical Layer does not own a detached fiber. The report says: “Scope detached background work. Fork detached work into a scope or retain it at an explicit owner.”

`Effect.forkChild` is structured ownership. `Effect.forkScoped`, `forkIn`, `Fiber.interrupt`, and scoped `FiberHandle` operations are explicit owners. A detached fiber returned by a generator for its caller to own is allowed.

## Conformant

```ts
import { Effect, Fiber, Layer } from "effect"

export const start = Effect.gen(function* () {
  const fiber = yield* Effect.forkDetach(Effect.never)
  return fiber
})
Effect.gen(function* () {
  const fiber = yield* Effect.forkDetach(Effect.never)
  yield* Fiber.interrupt(fiber)
})
Layer.effectDiscard(Effect.forkScoped(Effect.never))
```

## Non-conformant

```ts
import { Effect, Layer } from "effect"

Layer.effectDiscard(Effect.forkDetach(Effect.never))
```
