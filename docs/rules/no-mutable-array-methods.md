# no-mutable-array-methods

## What it does

Reports calls to these methods on array-like values: `copyWithin`, `fill`, `pop`, `push`, `reverse`, `shift`, `sort`, `splice`, and `unshift`.

## When to use it

Use it as the application-code default to avoid changing arrays in place. Prefer Effect's `Array` functions, non-mutating array methods, or spread syntax. An owned library kernel may use a local mutable array builder under explicit project policy, but this syntactic rule does not infer ownership or auto-exempt lexical mutation.

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
```
