# unbounded-stream-buffer

## What it does

Reports Effect `Stream.buffer` calls with an object-literal `capacity` set to the exact string `"unbounded"`. The report says: “Avoid unbounded Stream buffers. Use natural backpressure or a bounded buffer strategy.” Numeric capacities are allowed.

## When to use it

Use it to require bounded Stream buffers and preserve backpressure.

## Conformant

```ts
import { Stream } from "effect"

declare const source: unknown
Stream.buffer(source, { capacity: 16 })
```

## Non-conformant

```ts
import { Stream } from "effect"

declare const source: unknown
Stream.buffer(source, { capacity: "unbounded" })
```
