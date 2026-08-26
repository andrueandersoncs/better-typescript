# no-mutable-array-methods

## What it does

Reports calls to these methods on array-like values: `copyWithin`, `fill`, `pop`, `push`, `reverse`, `shift`, `sort`, `splice`, and `unshift`.

## When to use it

Use it to avoid changing arrays in place. Prefer Effect's `Array` functions, non-mutating array methods, or spread syntax.

## Conformant

```ts
const values = [1, 2]
const incremented = values.map((value) => value + 1)
```

## Non-conformant

```ts
const values = [1, 2]
values.push(3)
```
