# no-type-specific-equivalence-strict

## What it does

Reports each top-level primitive-specific binding of Effect's `Equivalence.strictEqual` after the first binding in a module. It reports the excess variable name.

The primitive boundary is a direct `string`, `number`, `boolean`, `bigint`, or `symbol` type argument. Direct comparisons, nested bindings, reference types, aliases, literals, and unions are allowed.

## When to use it

Use it to avoid families of primitive comparators that duplicate the same runtime operation. Compare at the use site or expose one generic comparison operation. A single semantically named binding is allowed.

## Conformant

```ts
import { Equivalence } from "effect"

const userIdEqual = Equivalence.strictEqual<string>()
const same = Equivalence.strictEqual<string>()("left", "right")
```

## Non-conformant

```ts
import { Equivalence } from "effect"

const stringEqual = Equivalence.strictEqual<string>()
const booleanEqual = Equivalence.strictEqual<boolean>()
```
