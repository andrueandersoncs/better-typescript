# no-try-catch

## What it does

Reports every `try` statement. It recommends explicit Effect errors and Effect recovery APIs instead of `try`/`catch`.

## When to use it

Use this rule when effectful failures must be modeled and recovered through Effect.

## Conformant

```ts
const read = () => 1
```

## Non-conformant

```ts
function read() {
  try {
    return 1
  } catch {
    return 0
  }
}
```
