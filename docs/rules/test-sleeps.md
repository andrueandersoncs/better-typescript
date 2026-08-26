# test-sleeps

## What it does

Reports `Effect.sleep` inside a test imported from `@effect/vitest`. The report says: “Avoid Effect.sleep in tests; synchronize deterministically. Use TestClock, Deferred, Queue, Latch, Ref, or an explicit test hook.” It does not report other Effect calls.

## When to use it

Use it to keep Effect tests deterministic and free of sleep-based synchronization.

## Conformant

```ts
import { Effect } from "effect"
import { it } from "@effect/vitest"

it.effect("works", () => Effect.succeed("done"))
```

## Non-conformant

```ts
import { Effect } from "effect"
import { it } from "@effect/vitest"

it.effect("waits", () => Effect.sleep("1 second"))
```
