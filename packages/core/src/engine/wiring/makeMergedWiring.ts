import { Array, Struct } from "effect"
import { Signal } from "../signal/data.js"
import { makeWiring } from "./makeWiring.js"
import { Wiring } from "./wiringClass.js"

// Merged derive preserves member order because later advice must not reorder earlier emissions.
export const makeMergedWiring = (wirings: ReadonlyArray<Wiring>) => {
  const policies = Array.flatMap(wirings, Struct.get("policies"))
  const applyDerive = (signals: ReadonlyArray<Signal>) => (wiring: Wiring) => wiring.derive(signals)
  const derive: Wiring["derive"] = (signals) => Array.flatMap(wirings, applyDerive(signals))

  return makeWiring({ policies, derive })
}
