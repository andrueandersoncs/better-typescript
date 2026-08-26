# no-immediate-effect-sync

## What it does

Reports `Effect.runSync(task)` when the immediately preceding statement binds `task` to `Effect.sync(...)` and those are the only two references to the binding in the containing block or file. It recognizes named `Effect` imports from `effect`, namespace imports from `effect/Effect`, and direct named imports from `effect/Effect`, including aliases. Direct imports use `sync(...)` and `runSync(...)`. A local lookalike is allowed when its spelling was not registered by a recognized import. A declaration that shadows a registered import spelling can still match because callee matching is textual.

## When to use it

Use it to run a synchronous action directly at a startup boundary. Keep the Effect when it is deferred or composed into a larger workflow.

## Conformant

```ts
import { Effect } from "effect"
const deferred = Effect.sync(() => 2)
void deferred
```

## Non-conformant

```ts
import { Effect } from "effect"
const task = Effect.sync(() => 1)
Effect.runSync(task)
```
