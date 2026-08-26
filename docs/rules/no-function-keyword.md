# no-function-keyword

## What it does

Reports non-generator function declarations and function expressions that use the `function` keyword. Generator functions and declarations needed for overload signatures are allowed.

## When to use it

Use it to prefer `const` declarations with arrow functions. Keep `function*` when generator semantics are required.

## Conformant

```ts
export function* values(): Generator<number, void, unknown> {
  yield 1
}
```

## Non-conformant

```ts
export function value(): number {
  return 1
}
```
