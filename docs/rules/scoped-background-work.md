# scoped-background-work

## What it does

Reports imported Effect background-work calls that have no recognized scope owner. It checks `Effect.forever`, `forkChild`, `forkDetach`, and `forkDaemon`. It also checks `Stream.runForEach`, `runDrain`, and `runFold` under `Effect.forever`.

The exact report is: `Scope background work. Own worker lifetime in a Layer and fork it into that scope.` Work under a Layer effect or scoped acquisition is allowed. So is work owned by `Effect.forkScoped` or `forkIn`, `FiberSet`, or `FiberMap`. The tested boundary reports `Effect.forkDaemon` and allows `Effect.forkScoped`.

## When to use it

Use it to ensure long-lived fibers have an explicit lifetime owner.

## Conformant

```ts
import { Effect } from "effect"

const worker = Effect.forkScoped(Effect.never)
```

## Non-conformant

```ts
import { Effect } from "effect"

const worker = Effect.forkDaemon(Effect.never)
```
