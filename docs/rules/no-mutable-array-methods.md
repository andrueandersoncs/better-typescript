# no-mutable-array-methods

## What it does

Reports in-place collection updates: `copyWithin`, `fill`, `pop`, `push`, `reverse`, `shift`, `sort`, `splice`, and `unshift` on array-like values; `copyWithin`, `fill`, `reverse`, `set`, and `sort` on typed arrays; `set`, `delete`, and `clear` on `Map`; `add`, `delete`, and `clear` on `Set`; `set` and `delete` on `WeakMap`; and `add` and `delete` on `WeakSet`. Subclasses are included.

## When to use it

Use it as the application-code default to avoid changing collections in place. Prefer Effect's `Array`, `HashMap`, or `HashSet` functions, non-mutating methods, or spread syntax. An owned library kernel may use a local mutable builder under explicit project policy, but this syntactic rule does not infer ownership or auto-exempt lexical mutation.

## Conformant

```ts
import { Array } from "effect"

const values = [1, 2]
const incremented = Array.map(values, (value) => value + 1)
```

## Non-conformant

```ts
const values = [1, 2]
values.push(3)

const cache = new Map<string, number>()
cache.set("a", 1)
```
