# unbounded-stream-collect

## What it does

Reports every Effect `Stream.runCollect` call. The report says: “Avoid collecting an unbounded production Stream. Consume the stream incrementally with runForEach, runDrain, or a bounded take.” The rule does not determine whether the source is bounded.

## When to use it

Use it when production streams must be consumed incrementally instead of collected in memory.

## Conformant

```ts
import { Stream } from "effect"

declare const source: unknown
Stream.runDrain(source)
```

## Non-conformant

```ts
import { Stream } from "effect"

declare const source: unknown
Stream.runCollect(source)
```
