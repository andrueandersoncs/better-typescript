import type { Signal } from "./subjectB.js"

// WiringSignals is one independently meaningful data subject of the equality chain.
export class WiringSignals {
  readonly matched = true
  readonly signals: ReadonlyArray<Signal> = []
}
