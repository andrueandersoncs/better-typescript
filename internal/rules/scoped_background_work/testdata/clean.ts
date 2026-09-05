import { Effect as Fx, Fiber, FiberHandle, Layer as L } from "effect"

const recipe = Fx.forkDetach(Fx.never)
void recipe
Fx.gen(function* () {
  const localRecipe = Fx.forkDetach(Fx.never)
  return localRecipe
})
L.effectDiscard(Fx.forkScoped(Fx.never))
L.effectDiscard(Fx.forkChild(Fx.never))
export const detached = Fx.gen(function* () {
  const fiber = yield* Fx.forkDetach(Fx.never)
  return fiber
})
Fx.gen(function* () {
  const fiber = yield* Fx.forkDetach(Fx.never)
  yield* Fiber.interrupt(fiber)
})
Fx.gen(function* () {
  const handle = yield* FiberHandle.make()
  const fiber = yield* Fx.forkDetach(Fx.never)
  yield* FiberHandle.set(handle, fiber)
})
L.effectDiscard(Fx.gen(function* () {
  const handle = yield* FiberHandle.make()
  yield* FiberHandle.run(handle, Fx.never)
}))
