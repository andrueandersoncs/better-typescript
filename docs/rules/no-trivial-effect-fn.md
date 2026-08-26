# no-trivial-effect-fn

## What it does

Reports variable-declared `Effect.fn` wrappers whose generator is exactly one `return yield*` call and forwards simple parameters in order, except wrappers recognized as service operations.

## When to use it

Export the operation directly unless the wrapper transforms, recovers, sequences, adds behavior, or is kept as a recognized service operation.

## Conformant

```ts
import { Effect } from "effect"
declare const decode: (value: string) => Effect.Effect<string>

export const decodeTrimmed = Effect.fn("decodeTrimmed")(
  function* (value: string) {
    return yield* decode(value.trim())
  },
)
```

## Non-conformant

```ts
import { Effect } from "effect"
declare const decode: (value: string) => Effect.Effect<string>

export const decodeValue = Effect.fn("decodeValue")(
  function* (value: string) {
    return yield* decode(value)
  },
)
```
