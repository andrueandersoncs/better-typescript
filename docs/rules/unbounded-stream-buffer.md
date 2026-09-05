# unbounded-stream-buffer

## What it does

Reports calls to Effect `Stream.buffer`, `Stream.bufferArray`, `Channel.buffer`, and `Channel.bufferArray` whose inline `capacity` is `"unbounded"`, `Infinity`, or `Number.POSITIVE_INFINITY`.

`Stream.buffer` counts individual elements. `bufferArray` counts chunks, so a finite chunk count is not a byte bound. A capacity of `0` is legal rendezvous backpressure. A finite `sliding` or `dropping` buffer is also legal, but loses messages; use `suspend` when delivery and backpressure must be preserved.

## Conformant

```ts
import { Stream } from "effect"

const source = Stream.make(1)
const buffered = Stream.buffer(source, { capacity: 16, strategy: "suspend" })
```

## Non-conformant

```ts
import { Stream } from "effect"

const source = Stream.make(1)
const buffered = Stream.bufferArray(source, { capacity: Infinity })
```
