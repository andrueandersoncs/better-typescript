# retry-without-jitter

## What it does

Reports a resolved `Effect.retry` or `Effect.retryOrElse` policy with an exponential or Fibonacci delay branch that is not wrapped by resolved `Schedule.jittered`. It examines the selected direct schedule or a v4 option policy's `schedule`, including direct `min`/`max` composition and `.pipe(Schedule.jittered)`, not task text or unrelated schedules.

Jitter changes retry delay only. It does not make an unbounded retry finite. Custom schedules and deliberate deterministic or server-directed pacing are left to an explicit local policy decision.

## When to use it

Use it for distributed retry policies where synchronized backoff would create avoidable contention.

## Conformant

```ts
import { Effect, Schedule } from "effect"

const task = Effect.fail("unavailable")
const retry = Effect.retry(task, Schedule.exponential("100 millis").pipe(Schedule.jittered))

void retry
```

## Non-conformant

```ts
import { Effect, Schedule } from "effect"

const task = Effect.fail("unavailable")
const retry = Effect.retry(task, Schedule.fibonacci("100 millis"))

void retry
```
