# layer-forever-acquisition

## What it does

For imported `Layer.effect`, `Layer.effectDiscard`, and `Layer.effectContext`, reports an acquisition argument containing `Effect.forever`, or both `Stream.forever` and a recognized Stream run method: `runCollect`, `runDrain`, `runForEach`, `runFold`, or `runFoldWhile`. It does not report when that argument contains `Effect.forkScoped`. The report says: “Fork long-lived work into the layer scope so acquisition completes. Run the worker with Effect.forkScoped, FiberSet, or FiberMap.”

## When to use it

Use it when a Layer starts long-lived work during acquisition.

## Conformant

```ts
import { Effect, Layer } from "effect"
export const worker = Layer.effectDiscard(
  Effect.forkScoped(Effect.forever(Effect.void)),
)
```

## Non-conformant

```ts
import { Effect, Layer } from "effect"
export const worker = Layer.effectDiscard(Effect.forever(Effect.void))
```
