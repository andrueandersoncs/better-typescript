# production-sleep-loops

## What it does

Reports a real Effect `sleep` call with a direct numeric or string literal duration that is directly yielded inside an `Effect.gen` `while (true)` or `for (;;)` loop when it represents fixed-pacing polling. Aliased Effect imports are recognized; unrelated functions and merely constructed sleep Effects are not.

## When to use it

Use `Effect.repeat` and `Schedule.spaced` when each iteration has the same intended pacing. This is a preference, not a claim that every sleeping loop has equivalent Schedule semantics. Deadline, latch, and event-driven loops may recalculate their delay and must remain explicit.

## Conformant

```ts
import { Effect } from "effect"

declare const deadline: number
const waitForDeadline = Effect.gen(function* () {
  while (true) {
    yield* Effect.sleep(deadline - Date.now())
  }
})
```

## Non-conformant

```ts
import { Effect } from "effect"

declare const poll: Effect.Effect<void>
const pollForever = Effect.gen(function* () {
  while (true) {
    yield* poll
    yield* Effect.sleep("1 second")
  }
})
```
