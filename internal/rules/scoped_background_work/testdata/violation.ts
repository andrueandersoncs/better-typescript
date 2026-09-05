import { Effect as Fx, Fiber, Layer as L } from "effect"
L.effectDiscard(Fx.forkDetach(Fx.never))
L.effectDiscard(Fx.gen(function* () {
  yield* Fx.forkDetach(Fx.never)
}))
Fx.gen(function* () {
  yield* Fx.forkDetach(Fx.never)
})
L.effectDiscard(Fx.gen(function* () {
  const fiber = yield* Fx.forkDetach(Fx.never)
  return fiber
}))
Fx.gen(function* () {
  const fiber = yield* Fx.forkDetach(Fx.never)
  Fiber.interrupt(fiber)
})
