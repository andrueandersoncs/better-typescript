# stream-pagination

## What it does

Reports a manual loop only when it has a bounded local pagination shape: the loop continuation is passed to an awaited or yielded page request, that request's result is accumulated, and the same continuation is updated from that result. Token spelling and an unrelated `paginate` call do not affect the result.

## Conformant

```ts
import { Effect, Option, Stream } from "effect"

type Page = { readonly items: ReadonlyArray<string>; readonly next: string | undefined }
declare const fetchPage: (cursor: string) => Effect.Effect<Page>

const pages = Stream.paginate("start", cursor =>
  Effect.map(fetchPage(cursor), page => [
    page.items,
    page.next === undefined ? Option.none() : Option.some(page.next),
  ] as const),
)
```

## Non-conformant

```ts
async function loadAll(fetchPage: (cursor: string) => Promise<{ items: string[]; next: string | undefined }>) {
  let cursor: string | undefined = "start"
  const items: string[] = []
  while (cursor) {
    const page = await fetchPage(cursor)
    items.push(...page.items)
    cursor = page.next
  }
  return items
}
```
