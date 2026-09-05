# no-function-keyword

## What it does

Reports non-generator function declarations and function expressions that use the `function` keyword. It keeps overload implementations, generators, and functions that lexically own `this`, implicit `arguments`, or `new.target`, including uses inside nested arrows.

## When to use it

Use it to prefer `const` declarations with arrow functions only when the conversion preserves language semantics.

## Conformant

```ts
const count = function () {
  return () => arguments.length
}
```

## Non-conformant

```ts
export function value(): number {
  return 1
}
```
