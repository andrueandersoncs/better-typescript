import { Effect as Fx } from "effect"
import { it as test } from "@effect/vitest"
import { TestClock as Clock } from "effect/testing"

test.effect("waits in the current fiber", () => Fx.gen(function*() {
  yield* Fx.sleep(1)
  yield* Clock.adjust(1)
}))

test.effect("also waits in the current fiber", () => Fx.gen(function*() {
  yield* Fx.sleep(1)
  const retries = 1
  yield* Clock.adjust(1)
}))

test.effect("waits across a successful yield", () => Fx.gen(function*() {
  yield* Fx.sleep("1 second")
  yield* Fx.succeed(0)
  yield* Clock.adjust(1)
}))
