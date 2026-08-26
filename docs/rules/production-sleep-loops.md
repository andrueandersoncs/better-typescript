# production-sleep-loops

## What it does

Reports `Effect.sleep` or `sleep` inside `while (true)` and conditionless `for` loops. Use an Effect Schedule for repetition and pacing.

## When to use it

Use it to avoid manual infinite polling loops. Sleep calls outside those loops are allowed.

## Conformant

```ts
declare const Effect: { sleep(ms: number): void }
Effect.sleep(1000)
```

## Non-conformant

```ts
declare const Effect: { sleep(ms: number): void }
while (true) { Effect.sleep(1000) }
```
