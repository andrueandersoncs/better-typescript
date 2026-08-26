# idempotent-retry

## What it does

Reports Effect `retry` or `retryOrElse` inside a function whose name starts with a mutation verb such as `save`. The report says: “Retry only idempotent operations. Establish idempotency in the domain contract before applying retry.” Retrieval names such as `fetch` are allowed.

## When to use it

Use it where Effect retries could repeat a mutation.

## Conformant

```ts
import { Effect } from "effect"
export const fetchUser = () => Effect.retry(Effect.void)
```

## Non-conformant

```ts
import { Effect } from "effect"
export const saveUser = () => Effect.retry(Effect.void)
```
