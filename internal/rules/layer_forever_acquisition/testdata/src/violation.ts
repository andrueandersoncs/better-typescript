import { Effect as Fx, Layer as L, Stream as S } from "effect"
L.effectDiscard(Fx.gen(function* () {
  yield* Fx.forkScoped(Fx.void)
  yield* Fx.forever(Fx.void)
}))
L.effectDiscard(Fx.never)
L.effectDiscard(S.runDrain(S.forever(S.succeed(1))))
