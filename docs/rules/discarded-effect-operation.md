# discarded-effect-operation

## What it does

Reports a bare call whose resolved result is an `Effect.Effect` expression statement in the immediate generator passed to `Effect.gen`, direct `Effect.fn`, or curried `Effect.fn("name")`. Nested callbacks, eager JavaScript calls, `Exit` values, and Effect runners are not reported.

## When to use it

An Effect is a lazy description. Yield, return, or compose it when the generator must execute it.

## Conformant

```ts lint=clean
import { Effect } from "effect"

const program = Effect.gen(function* () {
  yield* Effect.log("saved")
  return 1
})
```

## Non-conformant

```ts lint=error:4:3
import { Effect } from "effect"

const program = Effect.gen(function* () {
  Effect.log("saved")
  return 1
})
```
