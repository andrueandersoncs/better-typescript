import { Effect, Stream, Tuple } from "effect"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { collectSignals } from "@better-typescript/core/engine/derive"

// Shared join lives here because two advisers collect a signal pair the exact same way.
export const adviceFromSignalPair = <L, R, S>(
  left: Stream.Stream<L>,
  right: Stream.Stream<R>,
  toSignals: (leftSignals: ReadonlyArray<L>, rightSignals: ReadonlyArray<R>) => S,
  derive: (signals: S) => ReadonlyArray<Advice>
): Stream.Stream<Advice> => {
  const leftItems = collectSignals(left)
  const rightItems = collectSignals(right)
  const collectedPair = Tuple.make(leftItems, rightItems)
  const collected = Effect.all(collectedPair)

  const joined = Effect.map(
    collected,
    ([leftSignals, rightSignals]: readonly [ReadonlyArray<L>, ReadonlyArray<R>]): S =>
      toSignals(leftSignals, rightSignals)
  )

  const adviceEffect = Effect.map(joined, derive)

  return Stream.fromArrayEffect(adviceEffect)
}
