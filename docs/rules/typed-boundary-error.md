# typed-boundary-error

## What it does

Reports Effect `catchAll`, `catchAllDefect`, `catchCause`, and `catchAllCause` handlers that throw or construct `Error`. The report says: “Map boundary failures to typed domain errors. Translate infrastructure failures at the adapter seam into an operation-labelled domain error.”

## When to use it

Use it when catch handlers must translate failures into typed domain errors.

## Conformant

```ts
import { Effect } from "effect"

declare const operation: unknown
class LoadError { readonly _tag = "LoadError" }

Effect.catchAll(operation, () => Effect.fail(new LoadError()))
```

## Non-conformant

```ts
import { Effect } from "effect"

declare const operation: unknown
Effect.catchAll(operation, () => Effect.fail(new Error("failed")))
```
