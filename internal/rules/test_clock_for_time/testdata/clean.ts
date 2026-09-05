import { Effect, Fiber, Schedule } from "effect"
import { it } from "@effect/vitest"
import { TestClock } from "effect/testing"
import { Clock } from "./clock"

it.live("uses real time", () => Effect.gen(function*() {
  yield* Effect.sleep(1)
  yield* TestClock.adjust(1)
}))

it.effect("allows zero sleep", () => Effect.gen(function*() {
  yield* Effect.sleep(0)
  yield* TestClock.adjust(1)
}))

it.effect("forks before advancing", () => Effect.gen(function*() {
  const fiber = yield* Effect.forkChild(Effect.sleep(1))
  yield* TestClock.adjust(1)
  yield* Fiber.join(fiber)
}))

it.effect("allows cancellation", () => Effect.gen(function*() {
  const fiber = yield* Effect.forkChild(Effect.sleep(1))
  yield* Fiber.interrupt(fiber)
}))

it.effect("allows a live clock override", () =>
  TestClock.withLive(Effect.gen(function*() {
    yield* Effect.sleep(1)
    yield* TestClock.adjust(1)
  })))

const withUnknownClock = <A>(effect: Effect.Effect<A>): Effect.Effect<A> => effect
it.effect("allows an unknown wrapper", () =>
  withUnknownClock(Effect.gen(function*() {
    yield* Effect.sleep(1)
    yield* TestClock.adjust(1)
  })))

it.effect("does not trust arbitrary clocks", () => Effect.gen(function*() {
  yield* Effect.sleep(1)
  yield* Clock.adjust(1)
}))

const schedule = Schedule.exponential(1)
void schedule
