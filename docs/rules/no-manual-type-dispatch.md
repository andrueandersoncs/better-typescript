# no-manual-type-dispatch

## What it does

Reports the first statement in a chain of at least three adjacent guard `if` statements in one block. Each guard has no `else`, exits, and shares an identifier with the next guard. A two-guard chain is allowed.

## When to use it

Use it to replace hand-written type dispatch with `Match.value`, `Match.when`, and preferably `Match.exhaustive`.

## Conformant

```ts
function clamp(value: number): number {
  if (value < 0) return 0
  if (value > 10) return 10
  return value
}
```

## Non-conformant

```ts
function classify(value: string): string {
  if (value === "a") return "a"
  if (value === "b") return "b"
  if (value === "c") return "c"
  return "other"
}
```
