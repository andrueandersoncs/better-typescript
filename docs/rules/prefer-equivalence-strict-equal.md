# prefer-equivalence-strict-equal

## What it does

Reports every raw `===` comparison and recommends `Equivalence.strictEqual`. `Object.is` and `!==` are allowed.

## When to use it

Use it to enforce Effect equivalence functions instead of raw strict equality.

## Conformant

```ts
declare const left: number
declare const right: number
export const same = Object.is(left, right)
```

## Non-conformant

```ts
declare const left: number
declare const right: number
export const same = left === right
```
