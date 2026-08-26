# typed-error-recovery

## What it does

Reports Effect or Stream `catchCause` and `catchAllCause` calls when the recovered value has a non-`never` error channel. The report says: “Use typed error recovery instead of broad cause recovery. Use catchIf, catchTag, catchFilter, or retry for expected typed failures.” Broad cause recovery is allowed when the error channel is `never`.

## When to use it

Use it when expected typed failures should be recovered by type or retried.

## Conformant

```ts
import { Effect } from "effect"

declare const operation: Effect.Effect<string, never>
Effect.catchCause(operation, () => Effect.succeed("fallback"))
```

## Non-conformant

```ts
import { Effect } from "effect"

type Failure = { readonly _tag: "Failure" }
declare const operation: Effect.Effect<string, Failure>
Effect.catchCause(operation, () => Effect.succeed("fallback"))
```
