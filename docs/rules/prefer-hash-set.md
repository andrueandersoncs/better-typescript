# prefer-hash-set

## What it does

Reports bare global `new Set(...)`, unqualified global `Set`/`ReadonlySet` type references outside ambient declarations, `MutableHashSet` imported from `effect` or `effect/MutableHashSet`, and syntactic `Effect.MutableHashSet` access. A construction is exempt when passed directly or through its variable to a call whose resolved declarations are all outside the current source file; this includes other first-party files, not only third parties. Qualified or shadowed built-in names and `WeakSet` are not checked.

## When to use it

Use it as the application-code default for immutable Effect collections. An owned library kernel may intentionally use a native set behind a controlled interface under explicit project policy; this syntactic rule does not infer ownership or auto-exempt local kernels.

`HashSet` uses structural `Equal` and `Hash` by default. For reference identity, retain one `Equal.byReference` wrapper and use that same wrapper for each insertion and membership check. Every call creates a fresh wrapper, so rewrapping the raw object does not preserve native `Set` identity membership. If a public contract accepts raw object identities, moving to `HashSet` changes that contract; do not use `Equal.byReferenceUnsafe` as a routine replacement.

## Conformant

```ts lint=clean
import { Equal, HashSet } from "effect"

const object = { id: 1 }
const member = Equal.byReference(object)
const values = HashSet.make(member)

HashSet.has(values, member)
```

## Non-conformant

```ts lint=error:1:23
export const values = new Set<string>()
```
