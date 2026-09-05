# typed-error-recovery

## What it does

Reports Effect or Stream `catchCause` and `catchAllCause` calls whose resolved Effect error channel has supported, non-`never` typed failures. The report says: “Use typed error recovery instead of broad cause recovery. Use catchIf, catchTag, catchFilter, or retry for expected typed failures.”

The rule allows `E = never`, exact `cause => Effect.failCause(cause)` propagation (including a single returned block expression), and direct `Effect.logError(cause)` followed by that same re-emission. It also allows `Stream.failCause(cause)` from Stream recovery. `never` does not claim defect-free execution; it only has no typed error channel.

## Conformant

```ts
import { Effect } from "effect"

declare const operation: Effect.Effect<string, { readonly _tag: "Failure" }>
Effect.catchCause(operation, (cause) => { return Effect.failCause(cause) })
```

## Non-conformant

```ts
import { Effect } from "effect"

declare const operation: Effect.Effect<string, { readonly _tag: "Failure" }>
Effect.catchCause(operation, () => Effect.succeed("fallback"))
```
