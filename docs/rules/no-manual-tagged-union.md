# no-manual-tagged-union

## What it does

Reports a type alias whose union contains two or more inline object variants, every variant has a required literal-string `_tag`, and at least two tags differ.

The rule recognizes direct type literals, parentheses, and the compiler-provided `Readonly<T>`. It does not resolve referenced aliases, interfaces, or intersections.

## When to use it

Use `Data.TaggedEnum` for internal state or workflow decisions. Use `Schema.TaggedStruct` variants composed with `Schema.TaggedUnion` for reusable boundary data.

## Conformant

```ts lint=clean
import { Data } from "effect"

type Event = Data.TaggedEnum<{
  readonly Started: { readonly id: string }
  readonly Stopped: { readonly reason: string }
}>
```

## Non-conformant

```ts lint=error:1:6
type Event =
  | Readonly<{ readonly _tag: "Started"; readonly id: string }>
  | Readonly<{ readonly _tag: "Stopped"; readonly reason: string }>
```
