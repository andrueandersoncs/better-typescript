# no-for-loops

## What it does

Reports classic `for` loops that have a condition and also have an initializer or incrementor. An unbounded `for (;;)` loop is allowed.

## When to use it

Use it to replace iterator-based loops with Effect's `Array` functions, such as `Array.map`, `Array.reduce`, `Array.filter`, or `Array.flatMap`.

## Conformant

```ts
function wait(): void {
  for (;;) return
}
```

## Non-conformant

```ts
function count(): void {
  for (let index = 0; index < 2; index += 1) void index
}
```
