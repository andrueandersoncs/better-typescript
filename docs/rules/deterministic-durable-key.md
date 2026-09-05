# deterministic-durable-key

## What it does

Reports `Math.random`, `crypto.randomUUID`, `crypto.getRandomValues`, `Date.now`, and zero-argument `new Date` when they directly determine the returned `idempotencyKey` of resolved `Workflow.make` or `DurableQueue.make`, or the `primaryKey` of resolved `Rpc.make`.

It does not inspect `Workflow.Class`, arbitrary helpers, constants, or IDs generated before the payload exists. A nested deferred callback is also outside this lexical check.

## When to use it

Use it where workflow, durable-queue, or RPC replay must address the same logical payload with the same identity.

## Conformant

```ts
import { Schema } from "effect"
import { Workflow } from "effect/unstable/workflow"

const Charge = Workflow.make("Charge", {
  payload: { id: Schema.String },
  idempotencyKey: ({ id }) => id,
})

void Charge
```

## Non-conformant

```ts
import { Schema } from "effect"
import { Workflow } from "effect/unstable/workflow"

const Charge = Workflow.make("Charge", {
  payload: { id: Schema.String },
  idempotencyKey: () => Math.random().toString(),
})

void Charge
```
