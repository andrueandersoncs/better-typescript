# valid-effect-dual-arity

## What it does

Reports numeric literal arities `0` and `1` passed to the resolved Effect `Function.dual` API. Those arities throw at runtime. Predicate dispatch and supported numeric arities are allowed.

## When to use it

Use it to keep Effect's data-first/data-last helper on its supported dispatch forms.

## Conformant

```ts
import * as Function from "effect/Function"

const add = Function.dual(2, (self: number, n: number) => self + n)
```

## Non-conformant

```ts
import { dual } from "effect/Function"

const identity = dual(1, (self: number) => self)
```
