# prefer-hash-map

## What it does

Reports bare global `new Map(...)`, unqualified global `Map`/`ReadonlyMap` type references outside ambient declarations, `MutableHashMap` imported from `effect` or `effect/MutableHashMap`, and syntactic `Effect.MutableHashMap` access. A construction is exempt when passed directly or through its variable to a call whose resolved declarations are all outside the current source file; this includes other first-party files, not only third parties. Qualified or shadowed built-in names and `WeakMap` are not checked.

## When to use it

Use it as the application-code default for immutable Effect collections. An owned library kernel may intentionally use a native map behind a controlled interface under explicit project policy; this syntactic rule does not infer ownership or auto-exempt local kernels.

`HashMap` uses structural `Equal` and `Hash` by default. For reference identity, retain one `Equal.byReference` wrapper and use that same wrapper for each insertion and lookup. Every call creates a fresh wrapper, so rewrapping the raw object does not preserve native `Map` identity lookup. If a public contract accepts raw object identities, moving to `HashMap` changes that contract; do not use `Equal.byReferenceUnsafe` as a routine replacement.

## Conformant

```ts lint=clean
import { Equal, HashMap } from "effect"

const object = { id: 1 }
const key = Equal.byReference(object)
const values = HashMap.make([key, "value"])

HashMap.get(values, key)
```

## Non-conformant

```ts lint=error:1:23
export const values = new Map<string, number>()
```
