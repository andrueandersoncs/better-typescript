import { sleep as delay } from "effect/Effect"
import { Effect as Fx, Latch } from "effect"

Fx.gen(function* () {
  while (true) {
    yield* Fx.sleep("1 second")
  }
})

Fx.gen(function* () {
  while (true) {
    yield* delay(1000)
  }
})

declare const latch: Latch.Latch
Fx.gen(function* () {
  while (true) {
    yield* Latch.close(latch)
    yield* Fx.sleep(1000)
  }
})
while (true) { Fx.sleep("1 second") }

declare const deadline: number
Fx.gen(function* () {
  while (true) {
    if (Date.now() >= deadline) return
    yield* Fx.sleep(1000)
  }
})

function sleep(milliseconds: number): void {}
while (true) { sleep(1000) }
