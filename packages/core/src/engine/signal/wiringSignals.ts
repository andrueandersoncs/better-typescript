import { Array, Data } from "effect"
import { strictEqual } from "../equivalence/strictEqual.js"
import { signalArrayEquivalence, type Signal } from "./data.js"

// WiringSignals records match state and signals because unmatched is not empty.
export class WiringSignals extends Data.Class<{
  readonly matched: boolean
  readonly signals: ReadonlyArray<Signal>
}> {}

// Match state participates because a newly matched or removed glob scope must reach derivation.
export const wiringSignalsEquals = (a: WiringSignals, b: WiringSignals) => {
  const sameMatchState = strictEqual(b.matched)(a.matched)
  const sameSignals = signalArrayEquivalence(a.signals, b.signals)

  return sameMatchState && sameSignals
}

// One array equivalence exists because watch change gating compares whole signal batches.
export const wiringSignalsArrayEquivalence = Array.makeEquivalence(wiringSignalsEquals)
