# no-for-of-loops

## What it does

Reports every `for...of` and `for await...of` loop.

## When to use it

Use Array combinators for synchronous values. Use Stream or Effect combinators for an `AsyncIterable`.

## Conformant

```ts
const values = (input: ReadonlyArray<number>) => input.map(String)
```

## Non-conformant

```ts
function values(input: ReadonlyArray<number>): void {
  for (const value of input) void value
}
```
