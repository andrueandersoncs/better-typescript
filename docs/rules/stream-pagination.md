# stream-pagination

## What it does

Reports a `while`, `do`, or `for` loop that combines a page-token name with result accumulation. Accumulation includes `yield`, `push`, `concat`, `append`, `appendAll`, or `yield` calls. The report says: “Prefer Stream.paginate. Use Stream.paginate for an effectful token-based page source.” A loop is allowed when its enclosing function calls Effect's `Stream.paginate`.

## When to use it

Use it to replace manual token-based pagination loops with `Stream.paginate`.

## Conformant

```ts
import { Stream } from "effect"

const pages = Stream.paginate("start", cursor => [cursor, undefined])
```

## Non-conformant

```ts
async function loadAll() {
  let nextCursor: string | undefined = "start"
  const pages: unknown[] = []
  while (nextCursor) {
    pages.push(await Promise.resolve(nextCursor))
    nextCursor = undefined
  }
  return pages
}
```
