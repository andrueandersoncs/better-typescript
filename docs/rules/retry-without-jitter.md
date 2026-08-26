# retry-without-jitter

## What it does

Reports direct `Effect.retry(...)` or `retry(...)` calls whose source contains `Schedule.exponential` or `Schedule.fibonacci` but no `Schedule.jittered` or `.jittered`.

It reports exactly: `Jitter exponential retry. Add Schedule.jittered to the bounded backoff schedule.` The check is syntactic. It does not verify that the schedule is bounded, and other retry callee spellings are allowed.

## When to use it

Use it when exponential or Fibonacci Effect retry schedules should add jitter instead of retrying in lockstep.

## Conformant

The fixture allows an exponential schedule wrapped with `Schedule.jittered`:

```ts
Effect.retry({}, Schedule.jittered(Schedule.exponential("1 second")))
```

## Non-conformant

The fixture reports the same retry without jitter:

```ts
Effect.retry({}, Schedule.exponential("1 second"))
```
