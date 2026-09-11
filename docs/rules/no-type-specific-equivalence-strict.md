# no-type-specific-equivalence-strict

## What it does

Reports every top-level binding of Effect's `Equivalence.strictEqual` with a direct primitive type argument. It reports the variable name.

The primitive boundary is a direct `string`, `number`, `boolean`, `bigint`, or `symbol` type argument. Direct comparisons, nested bindings, reference types, aliases, literals, and unions are allowed.

## When to use it

Use it to avoid primitive comparators that bind the same runtime operation without adding behavior. Call `Equivalence.strictEqual` at the comparison site instead.

## Conformant

```ts
import { Equivalence } from "effect"

const same = Equivalence.strictEqual<string>()("left", "right")
```

## Non-conformant

```ts
import { Equivalence } from "effect"

const stringEqual = Equivalence.strictEqual<string>()
```
