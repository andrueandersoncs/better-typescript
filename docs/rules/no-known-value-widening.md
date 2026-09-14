# no-known-value-widening

## What it does

Reports known values explicitly widened to `unknown`, `object`, anonymous object types, or open dictionaries. Empty dictionary accumulators remain valid.

## When to use it

Use it to preserve inferred keys and types. Prefer inference or `satisfies`.

## Conformant

```ts
const handlers = { start } satisfies Record<string, Handler>
```

## Non-conformant

```ts
const handlers: Record<string, Handler> = { start }
```
