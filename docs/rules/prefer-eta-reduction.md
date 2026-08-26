# prefer-eta-reduction

## What it does

Reports expression-bodied arrows with one required identifier parameter used exactly once as the innermost sole argument of a unary call tower, unless any call’s callee is a checker-identified method. Block bodies and multi-argument calls are allowed.

## When to use it

Use it to remove forwarding wrappers and nested unary calls.

## Conformant

```ts
declare const f: (x: number, y: number) => number
export const wrapped = (x: number) => f(x, 1)
```

## Non-conformant

```ts
declare const f: (x: number) => number
export const wrapped = (x: number) => f(x)
```
