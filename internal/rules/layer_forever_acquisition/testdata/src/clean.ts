import { Effect as Fx, Layer as L } from "effect"

L.effectDiscard(Fx.forkChild(Fx.never))
L.effectDiscard(Fx.forkScoped(Fx.forever(Fx.void)))
L.effectDiscard(Fx.forever(Fx.void).pipe(Fx.forkScoped))
L.effectDiscard(Fx.forever(Fx.void).pipe(Fx.timeout(1)))
L.effectDiscard(Fx.succeed(Fx.never))
L.effectDiscard(Fx.gen(function* () {
  const unused = Fx.never
  return unused
}))
L.effectDiscard(Fx.succeed({ start: () => Fx.forever(Fx.void) }))
