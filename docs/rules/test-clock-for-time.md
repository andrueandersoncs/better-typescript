# test-clock-for-time

## What it does

Reports a narrow virtual-clock deadlock pattern: a resolved `it.effect` callback directly returns an `Effect.gen` generator that yields a positive numeric or supported Duration-string literal to `Effect.sleep`, then directly yields resolved `TestClock.adjust` or `TestClock.setTime` later in the same straight-line block. Literal local declarations and yielded effects may appear between the two yields.

It does not infer arbitrary clock wrappers or control flow. `it.live`, zero sleeps, inert schedules, clock overrides, and fork/adjust/join or cancellation patterns are allowed.

## When to use it

Use it to keep virtual-clock tests deterministic without waiting on a sleep before the same fiber can advance the clock.

## Conformant

```ts
import { Effect, Fiber } from "effect"
import { it } from "@effect/vitest"
import { TestClock } from "effect/testing"

it.effect("waits", () => Effect.gen(function*() {
  const fiber = yield* Effect.forkChild(Effect.sleep(1_000))
  yield* TestClock.adjust(1_000)
  yield* Fiber.join(fiber)
}))
```

## Non-conformant

```ts
import { Effect } from "effect"
import { it } from "@effect/vitest"
import { TestClock } from "effect/testing"

it.effect("waits", () => Effect.gen(function*() {
  yield* Effect.sleep(1_000)
  yield* TestClock.adjust(1_000)
}))
```
