# unbounded-stream-collect

## What it does

Reports `Stream.runCollect`, `Stream.collect`, `Stream.run(source, Sink.collect())`, and `Channel.runCollect` when the input has no locally established cardinality bound. It also recognizes those Stream collectors in a direct `pipe` chain, including `source.pipe(Stream.run(Sink.collect()))`.

The rule proves only a small finite subset: `Stream.make`, `empty`, `succeed`, literal array/iterable sources, literal `fromArrays` sources, finite local constants, and a nonnegative finite numeric literal passed to `Stream.take` before collection. It does not claim that an unknown source is infinite. A `take` after a collecting operation cannot repair the collector's earlier retention; a later expansion can make a subsequent collector unbounded again.

A non-literal `number` does not establish this proof because it may be `Infinity`. The rule does not propagate literal arguments from helper call sites into a helper body. Put the finite literal at the local `Stream.take` when collection must be proven bounded.

## Conformant

```ts
import { Effect, Stream } from "effect"

const source = Stream.fromEffectRepeat(Effect.succeed(1))
const values = source.pipe(Stream.take(10), Stream.runCollect)
```

## Non-conformant

```ts
import { Effect, Stream } from "effect"

const source = Stream.fromEffectRepeat(Effect.succeed(1))
const values = source.pipe(Stream.runCollect)

const collectSome = (limit: number) =>
  source.pipe(Stream.take(limit), Stream.runCollect)
```

Use `runForEach` or `runDrain` when the caller does not need every retained value. A count bound does not prove a byte bound or limit upstream intermediate retention.
