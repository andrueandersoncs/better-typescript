# inflight-dedupe-map

## What it does

Reports `new Map` expressions, and their initialized variable declarations, when the rendered map or declaration type or new-expression text contains `Promise<` or `Effect<` anywhere. The match is not limited to the value type. The report says: “Avoid a hand-rolled in-flight deduplication Map when Effect Cache fits. Cache.get shares an in-flight lookup for the same missing key.”

## When to use it

Use it when Effect Cache can share one in-flight lookup per missing key.

## Conformant

```ts
void new Map<string, string>()
```

## Non-conformant

```ts
void new Map<string, Promise<string>>()
```
