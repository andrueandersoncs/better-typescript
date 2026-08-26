# prefer-hash-map

## What it does

Reports bare global `new Map(...)`, unqualified global `Map`/`ReadonlyMap` type references outside ambient declarations, `MutableHashMap` imported from `effect` or `effect/MutableHashMap`, and syntactic `Effect.MutableHashMap` access. A construction is exempt when passed directly or through its variable to a call whose resolved declarations are all outside the current source file; this includes other first-party files, not only third parties. Qualified or shadowed built-in names and `WeakMap` are not checked.

## When to use it

Use it for immutable Effect collections.

## Conformant

```ts
import { HashMap } from "effect"

export const values = HashMap.fromIterable([["a", 1]])
```

## Non-conformant

```ts
export const values = new Map<string, number>()
```
