# tx-queue-batch-capacity

## What it does

Reports a directly yielded `TxQueue.offerAll(queue, [...])` whose no-spread array literal is larger than the finite, nonnegative integer literal capacity of a fresh local `yield* TxQueue.bounded(...)` queue. The fact remains while the local receiver is neither reassigned nor passed to another operation. Fractional or unknown capacities, ordinary queues, and dropping or sliding queues are allowed.

## When to use it

A bounded `TxQueue` offers the whole batch atomically. While the queue stays open, a batch larger than its capacity cannot be accepted as one transaction.

## Conformant

```ts
import { Effect, TxQueue } from "effect"

const program = Effect.gen(function* () {
  const queue = yield* TxQueue.bounded<number>(2)
  yield* TxQueue.offerAll(queue, [1, 2])
})
```

## Non-conformant

```ts
import { Effect, TxQueue } from "effect"

const program = Effect.gen(function* () {
  const queue = yield* TxQueue.bounded<number>(1)
  yield* TxQueue.offerAll(queue, [1, 2])
})
```
