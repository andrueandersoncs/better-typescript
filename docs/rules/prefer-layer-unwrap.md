# prefer-layer-unwrap

## What it does

Reports a manual `Layer.effect` and `Layer.flatMap` bridge when the same tag unwraps an Effect-produced Layer. Use `Layer.unwrap` instead.

## When to use it

Use it with Effect Layers. It only reports Effect APIs and a matching tag.

## Conformant

```ts
import { Effect, Layer } from "effect"
const selected = Effect.succeed(Layer.empty)
export const value = Layer.unwrap(selected)
```

## Non-conformant

```ts
import { Context, Effect, Layer } from "effect"
class Selected extends Context.Service<Selected, Layer.Layer<never>>()("Selected") {}
const selected = Effect.succeed(Layer.empty)
export const value = Layer.flatMap(
  Layer.effect(Selected, selected),
  Context.get(Selected),
)
```
