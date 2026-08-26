# cache-per-request

## What it does

Reports `.make(...)` and `.makeWith(...)` on a receiver whose text ends in `Cache` when the call is inside a function with parameters or inside any non-module-scope function. Cache construction is allowed at module scope or in a module-scope function with no parameters. Cache calls nested within another cache construction are also allowed.

## When to use it

Use it to create one cache in its owning layer or scope instead of creating a new cache for each request.

## Conformant

```ts
declare const Cache: any

const shared = () => Cache.make({ lookup: () => 1 })
```

## Non-conformant

```ts
declare const Cache: any

function handler(request: string) {
  return Cache.make({ lookup: () => request })
}
```
