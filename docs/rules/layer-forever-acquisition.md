# layer-forever-acquisition

## What it does

Reports an imported `Effect.forever` or `Effect.never`, and a `Stream.forever` consumed by `Stream.runDrain` or `runCollect`, that executes in a `Layer.effect`, `Layer.effectDiscard`, or `Layer.effectContext` acquisition. It follows the immediate acquisition expression and immediate `Effect.gen` body. An unrelated `forkScoped` does not exempt foreground work, while `Effect.forkScoped` or `forkChild` (including direct `pipe` use) and an explicit timeout do. `Effect.succeed(Effect.never)` is a cold value, not executed acquisition work.

The report says: “Fork long-lived work into the layer scope so acquisition completes. Run the worker with Effect.forkScoped, FiberSet, or FiberMap.” Uncalled service methods are not acquisition work.

## Conformant

```ts
import { Effect, Layer } from "effect"

Layer.effectDiscard(Effect.forkChild(Effect.never))
Layer.effectDiscard(Effect.forever(Effect.void).pipe(Effect.forkScoped))
Layer.effectDiscard(Effect.succeed(Effect.never))
```

## Non-conformant

```ts
import { Effect, Layer } from "effect"

Layer.effectDiscard(Effect.forever(Effect.void))
```
