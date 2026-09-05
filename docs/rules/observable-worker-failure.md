# observable-worker-failure

## What it does

Reports imported `Effect.ignore` and `Effect.ignoreCause` calls that silently discard failures. `log: true` and supported literal severity options observe the failure when they remain the effective final option; a later spread can override that proof. `ignore` also accepts directly adjacent `Effect.tapError(Effect.logError)` observation in data-first or `pipe` form. `ignoreCause` can swallow defects and interruptions, so it requires cause-aware `Effect.tapCause(Effect.logError)` observation instead. Later pipeline stages are not treated as observed by an earlier tap.

Unrelated logging in the surrounding function does not observe this failure. Calls to unrelated functions named `ignore` are allowed.

## Conformant

```ts
import { Effect } from "effect"

Effect.fail("bad").pipe(Effect.tapError(Effect.logError), Effect.ignore)
Effect.ignoreCause(Effect.fail("bad").pipe(Effect.tapCause(Effect.logError)))
```

## Non-conformant

```ts
import { Effect } from "effect"

Effect.ignoreCause(Effect.fail("bad").pipe(Effect.tapError(Effect.logError)))
```
