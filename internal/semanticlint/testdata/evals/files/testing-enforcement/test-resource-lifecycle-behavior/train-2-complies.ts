import { it } from "@effect/vitest"
import { Effect, Fiber, Ref, TestClock, Duration } from "effect"
import { expect } from "vitest"
import { acquireLease, LeaseStore } from "../src/lease"
import { makeInMemoryLeaseStore } from "./support/inMemoryLeaseStore"

it.effect("holds the lease while the job runs", () =>
  Effect.gen(function* () {
    const store = yield* makeInMemoryLeaseStore
    const seen = yield* Ref.make<ReadonlyArray<string>>([])

    const job = Effect.scoped(
      Effect.gen(function* () {
        yield* acquireLease("nightly-export")
        const holders = yield* store.holders("nightly-export")
        yield* Ref.set(seen, holders)
        yield* Effect.sleep(Duration.minutes(5))
      }),
    ).pipe(Effect.provideService(LeaseStore, store))

    const fiber = yield* Effect.fork(job)
    yield* TestClock.adjust(Duration.minutes(1))

    expect(yield* Ref.get(seen)).toHaveLength(1)

    yield* Fiber.interrupt(fiber)

    expect(yield* store.holders("nightly-export")).toHaveLength(0)
  }),
)
