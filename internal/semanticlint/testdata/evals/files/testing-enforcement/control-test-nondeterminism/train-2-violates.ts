import { Effect, Fiber, Ref } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { makeRateLimiter } from "../src/rate-limiter.js"

describe("makeRateLimiter", () => {
  it.effect("admits requests up to the burst size", () =>
    Effect.gen(function* () {
      const limiter = yield* makeRateLimiter({ burst: 3, refillPerSecond: 1 })
      const admitted = yield* Effect.all([limiter.tryAcquire, limiter.tryAcquire, limiter.tryAcquire])
      expect(admitted).toEqual([true, true, true])
    })
  )

  it.live("holds back waiters once the burst is spent", () =>
    Effect.gen(function* () {
      const limiter = yield* makeRateLimiter({ burst: 2, refillPerSecond: 1 })
      const completed = yield* Ref.make(0)
      const fiber = yield* Effect.fork(
        Effect.forEach([1, 2, 3, 4], () => limiter.acquire.pipe(Effect.zipRight(Ref.update(completed, (n) => n + 1))), {
          concurrency: "unbounded"
        })
      )
      yield* Effect.sleep("50 millis")
      expect(yield* Ref.get(completed)).toBe(2)
      yield* Fiber.interrupt(fiber)
    })
  )
})
