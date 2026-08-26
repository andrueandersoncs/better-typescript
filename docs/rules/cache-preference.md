# cache-preference

## What it does

Reports `new Map()` when its immediate parent is a named variable declaration or object-literal property assignment, or when it is the right operand of a direct binary expression, and the extracted binding text contains `cache` case-insensitively. It also reports `.set()` calls that store an object with a common expiry field, unless the file uses `Cache.make` or `Cache.makeWith`.

## When to use it

Use this rule when Effect Cache lifecycle semantics fit better than a hand-written `Map`.

## Conformant

```ts
const values = new Map<string, string>()
```

## Non-conformant

```ts
const userCache = new Map<string, string>()
```
