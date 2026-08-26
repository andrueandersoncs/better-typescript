# prefer-hash-set

## What it does

Reports bare global `new Set(...)`, unqualified global `Set`/`ReadonlySet` type references outside ambient declarations, `MutableHashSet` imported from `effect` or `effect/MutableHashSet`, and syntactic `Effect.MutableHashSet` access. A construction is exempt when passed directly or through its variable to a call whose resolved declarations are all outside the current source file; this includes other first-party files, not only third parties. Qualified or shadowed built-in names and `WeakSet` are not checked.

## When to use it

Use it for immutable Effect collections.

## Conformant

```ts
import { HashSet } from "effect"

export const values = HashSet.fromIterable([1, 2, 3])
```

## Non-conformant

```ts
export const values = new Set<string>()
```
