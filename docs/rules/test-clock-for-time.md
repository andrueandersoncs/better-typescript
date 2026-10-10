# test-clock-for-time

## What it does

Reports fixed wall-clock waits in test files: `*.test.*`, `*.spec.*`, and files under `test/`, `tests/`, or `__tests__/`. A fixed wait is any real sleep, whatever its duration:

- `new Promise((resolve) => setTimeout(resolve, ms))`, including `() => resolve()` callbacks.
- Calls to a named helper whose only result is that promise, in any project file.
- `delay` and `sleep-promise` imports, and `setTimeout` from `timers/promises` or `node:timers/promises`.
- `Bun.sleep` and `Bun.sleepSync`.
- `<page>.waitForTimeout(ms)`.
- `Effect.sleep` whose nearest runner is real time: `it.live`-style `@effect/vitest` tests, `Effect.run*` (direct or in `pipe`), or `TestClock.withLive`.

A file that calls `useFakeTimers` (Vitest, Jest, Sinon) or `install` from `@sinonjs/fake-timers` is skipped. `Effect.sleep` under `it.effect` and other non-live `@effect/vitest` tests uses TestClock and is allowed.

It also reports a narrow virtual-clock deadlock pattern in any file: a resolved `it.effect` callback directly returns an `Effect.gen` generator that yields a positive numeric or supported Duration-string literal to `Effect.sleep`, then directly yields resolved `TestClock.adjust` or `TestClock.setTime` later in the same straight-line block. Literal local declarations and yielded effects may appear between the two yields. It does not infer arbitrary clock wrappers or control flow; `it.live`, zero sleeps, inert schedules, clock overrides, and fork/adjust/join or cancellation patterns are allowed.

## When to use it

Use it to keep tests waiting for real events or controlled clocks, not guessed delays.

## Conformant

```ts
import { Effect, Fiber } from "effect"
import { it } from "@effect/vitest"
import { TestClock } from "effect/testing"

it("connects", async () => {
  await client.connect()
  expect(client.connected()).toBe(true)
})

it("refreshes", async () => {
  vi.useFakeTimers()
  scheduleRefresh(events)
  await vi.advanceTimersByTimeAsync(30)
  expect(events).toEqual(["refreshed"])
})

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

it("connects", async () => {
  client.connect()
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(client.connected()).toBe(true)
})

it.live("waits", () => Effect.sleep("1 second"))

it.effect("waits", () => Effect.gen(function*() {
  yield* Effect.sleep(1_000)
  yield* TestClock.adjust(1_000)
}))
```
