import { Effect, Queue, TxQueue } from "effect"

declare const escape: (queue: TxQueue.TxQueue<number>) => void
declare const unknownCapacity: number

Effect.gen(function* () {
  const tooSmall = yield* TxQueue.bounded<number>(1)
  yield* Effect.log("created")
  yield* TxQueue.offerAll(tooSmall, [1, 2])
})

Effect.gen(function* () {
  const zero = yield* TxQueue.bounded<number>(0)
  yield* TxQueue.offerAll(zero, [1])
})

Effect.gen(function* () {
  const fitting = yield* TxQueue.bounded<number>(2)
  yield* TxQueue.offerAll(fitting, [1, 2])
})

Effect.gen(function* () {
  const fractional = yield* TxQueue.bounded<number>(1.5)
  yield* TxQueue.offerAll(fractional, [1, 2])
})
Effect.gen(function* () {
  const unknown = yield* TxQueue.bounded<number>(unknownCapacity)
  yield* TxQueue.offerAll(unknown, [1, 2])
})


Effect.gen(function* () {
  const spread = yield* TxQueue.bounded<number>(1)
  yield* TxQueue.offerAll(spread, [...[1, 2]])
})

Effect.gen(function* () {
  const queue = yield* Queue.bounded<number>(1)
  yield* Queue.offerAll(queue, [1, 2])
})

Effect.gen(function* () {
  const escaped = yield* TxQueue.bounded<number>(1)
  escape(escaped)
  yield* TxQueue.offerAll(escaped, [1, 2])
})
