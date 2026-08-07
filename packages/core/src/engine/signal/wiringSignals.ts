import { Data } from "effect"
import type { Signal } from "./data.js"

// WiringSignals records match state and signals because unmatched is not empty.
export class WiringSignals extends Data.Class<{
  readonly matched: boolean
  readonly signals: ReadonlyArray<Signal>
}> {}
