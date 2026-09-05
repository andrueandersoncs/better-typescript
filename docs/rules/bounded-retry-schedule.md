# bounded-retry-schedule

## What it does

Reports a resolved `Effect.retry` or `Effect.retryOrElse` policy only when its recurrence is proven unbounded. Direct v4 option policies use `schedule` and `times`: a finite literal `times` bounds the policy, while a `schedule` is classified by its recurrence. `while` and `until` predicates are unknown rather than finite proof.

The rule recognizes `Schedule.recurs` with a finite numeric literal, `Schedule.upTo({ times })`, and `Schedule.max`/`Schedule.min`: `max` stops when any child stops, while `min` stops only when every child stops. `Schedule.jittered` changes delay, not recurrence. `Schedule.recurs(Infinity)`, custom schedules, and option values it cannot resolve are not finite proof. The existing nearby lifetime waiver comments remain available for explicitly supervised forever reconnect loops.

## When to use it

Use it for retries that must end independently of a service lifetime.

## Conformant

```ts
import { Effect, Schedule } from "effect"

const task = Effect.fail("unavailable")
const retry = Effect.retry(task, Schedule.max([
  Schedule.recurs(3),
  Schedule.exponential("100 millis"),
]))

void retry
```

## Non-conformant

```ts
import { Effect, Schedule } from "effect"

const task = Effect.fail("unavailable")
const retry = Effect.retry(task, Schedule.min([
  Schedule.recurs(3),
  Schedule.exponential("100 millis"),
]))

void retry
```
