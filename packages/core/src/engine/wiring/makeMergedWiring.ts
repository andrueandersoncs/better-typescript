import { Array, Effect, Function, Struct, pipe } from "effect"
import type { Advice } from "../derive/advice.js"
import { makeWiring } from "./makeWiring.js"
import { Wiring } from "./wiringClass.js"
import type { WiringError } from "./wiringError.js"

// Merged derive preserves member order because later advice must not reorder earlier emissions.
export const makeMergedWiring = <const Wirings extends ReadonlyArray<Wiring<unknown>>>(
  wirings: Wirings
): Wiring<WiringError<Wirings[number]>> => {
  type E = WiringError<Wirings[number]>
  const policies = Array.flatMap(wirings, Struct.get("policies"))
  const derivations = Array.map(wirings, Struct.get("derive"))

  const derive: Wiring<E>["derive"] = Effect.fn("Wiring.mergeDerive")(function* (signals) {
    const effects: ReadonlyArray<Effect.Effect<ReadonlyArray<Advice>, unknown>> = Array.map(
      derivations,
      Function.apply(signals)
    )

    const adviceGroups = yield* pipe(
      Effect.all(effects),
      Effect.mapError((error) => error as E)
    )

    return Array.flatten(adviceGroups)
  })

  return makeWiring({ policies, derive })
}
