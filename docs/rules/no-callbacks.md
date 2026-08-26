# no-callbacks

## What it does

Reports non-ambient function declarations and expressions, arrow functions, method declarations and signatures, call signatures, and selected function-type annotations that return `void` and accept a callable parameter. It does not check accessors or constructors.

## When to use it

Use it to avoid callback-style void APIs. Return an Effect from the operation instead. Functions with a non-`void` return type are allowed.

## Conformant

```ts
type Handler = () => void
export function apply(callback: Handler): number {
  callback()
  return 1
}
```

## Non-conformant

```ts
type Handler = () => void
export function subscribe(callback: Handler): void {
  callback()
}
```
