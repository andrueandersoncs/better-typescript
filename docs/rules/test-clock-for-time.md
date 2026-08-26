# test-clock-for-time

## What it does

Reports Effect sleep, timeout, retry, and Schedule backoff calls inside tests imported from `@effect/vitest`. The report says: “Use TestClock for time-sensitive tests. Fork time-dependent work, then advance TestClock instead of real time.” The rule allows the file when it imports `TestClock`.

## When to use it

Use it when Effect tests must control time instead of waiting for real time.

## Conformant

```ts
import { Effect } from "effect"
import { it } from "@effect/vitest"
import { TestClock } from "effect/testing"

it.effect("waits", () =>
  Effect.zipRight(Effect.sleep("1 second"), TestClock.adjust("1 second"))
)
```

## Non-conformant

```ts
import { Effect } from "effect"
import { it } from "@effect/vitest"

it.effect("waits", () => Effect.sleep("1 second"))
```
