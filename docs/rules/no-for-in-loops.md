# no-for-in-loops

## What it does

Reports every `for...in` loop.

## When to use it

Use it to replace imperative record iteration with Effect's `Record` functions, such as `Record.map`, `Record.reduce`, or `Record.toEntries`.

## Conformant

```ts
import { Record as EffectRecord } from "effect"

const keys = (value: Record<string, number>) => EffectRecord.keys(value)
```

## Non-conformant

```ts
function keys(value: Record<string, number>): void {
  for (const key in value) void key
}
```
