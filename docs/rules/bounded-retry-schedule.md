# bounded-retry-schedule

## What it does

Reports bare `retry(...)` and exact-identifier `Effect.retry(...)` calls when the syntactically selected policy fails a textual bound heuristic. An object first argument is the policy; otherwise argument 2 is used when present, or a sole non-function argument is used. A non-object is allowed when its raw text contains a listed bound word. An object is allowed by a numeric/identifier `times`, any `while` or `until`, a bounded `schedule`, or no `schedule`. Bounds include `recurs`, `upTo`, `times`, `count`, `while`, `until`, and `intersect`. A call is allowed when its preceding 300 source characters contain `unbounded`, `forever-ok`, `allow-forever`, or `effect-quality-allow-unbounded-retry`.

## When to use it

Use it to keep retry loops operationally bounded unless local code documents why they may run forever.

## Conformant

```ts
declare const Effect: any
declare const Schedule: any
declare const task: any

Effect.retry(task, Schedule.recurs(3))
```

## Non-conformant

```ts
declare const Effect: any
declare const Schedule: any
declare const task: any

Effect.retry(task, Schedule.forever)
```
