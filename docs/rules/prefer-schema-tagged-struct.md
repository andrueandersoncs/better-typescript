# prefer-schema-tagged-struct

## What it does

Reports an Effect Data.TaggedClass when its heritage-clause source text contains none of the blocked substrings `=>`, `unknown`, ` any`, `any `, `undefined`, `void`, `bigint`, `symbol`, `Stream.`, `Effect.`, `Layer.`, `Context.`, `Date`, `Map<`, or `Set<`. This text heuristic does not prove portability or recognize arbitrary live handles and custom nonportable types.

## When to use it

Use this heuristic to prompt schema modeling when the heritage text passes the blocked-substring check. It does not prove portability or recognize arbitrary live handles and custom nonportable types.

## Conformant

```ts
import { Data, Stream } from "effect"
export class RuntimeTask extends Data.TaggedClass("RuntimeTask")<{
  readonly stream: Stream.Stream<string>
}> {}
```

## Non-conformant

```ts
import { Data } from "effect"
export class PortableEvent extends Data.TaggedClass("PortableEvent")<{
  readonly id: string
  readonly active: boolean
}> {}
```
