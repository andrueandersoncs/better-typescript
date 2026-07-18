import { Effect, Stream, pipe } from "effect"
import type { Advice } from "@better-typescript/core/engine/derive/data"

// Shared join lives here because two advisers collect a signal pair the exact same way.
const materializeAdviceFromSignalPair = Effect.fn("Support.adviceFromSignalPair")(function* <
  L,
  R,
  S
>(
  left: Stream.Stream<L>,
  right: Stream.Stream<R>,
  toSignals: (leftSignals: ReadonlyArray<L>, rightSignals: ReadonlyArray<R>) => S,
  derive: (signals: S) => ReadonlyArray<Advice>
): Effect.fn.Return<ReadonlyArray<Advice>> {
  const leftItems = yield* Stream.runCollect(left)
  const rightItems = yield* Stream.runCollect(right)
  const signals = toSignals(leftItems, rightItems)

  return derive(signals)
})

export const adviceFromSignalPair = <L, R, S>(
  left: Stream.Stream<L>,
  right: Stream.Stream<R>,
  toSignals: (leftSignals: ReadonlyArray<L>, rightSignals: ReadonlyArray<R>) => S,
  derive: (signals: S) => ReadonlyArray<Advice>
): Stream.Stream<Advice> =>
  pipe(materializeAdviceFromSignalPair(left, right, toSignals, derive), Stream.fromArrayEffect)
