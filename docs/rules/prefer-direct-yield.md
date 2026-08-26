# prefer-direct-yield

## What it does

Reports a `const` inside an Effect generator when its only reference is a direct `yield*`. The report says: `Avoid binding an Effect only to yield* it.`

## When to use it

Use it to yield the Effect expression directly. A binding used more than once or used somewhere other than that `yield*` is allowed.

## Conformant

```ts
import { Effect } from "effect"

const program = Effect.gen(function* () {
  yield* Effect.succeed(1)
})
```

## Non-conformant

```ts
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const task = Effect.succeed(1)
  yield* task
})
```
