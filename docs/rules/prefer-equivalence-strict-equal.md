# prefer-equivalence-strict-equal

## What it does

Reports every raw `===` comparison and recommends `Equivalence.strictEqual`. `!==` is allowed by this rule.

## When to use it

Use it to enforce Effect equivalence functions instead of raw strict equality.

## Conformant

```ts
import { Equivalence } from "effect"

declare const left: number
declare const right: number
export const same = Equivalence.strictEqual<number>()(left, right)
```

## Non-conformant

```ts
declare const left: number
declare const right: number
export const same = left === right
```
