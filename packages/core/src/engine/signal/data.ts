import { Data } from "effect"
import type { RefactorExample } from "../example/data.js"
import type { Detection } from "../location/data.js"

// Signal is one named check result because rendering and advice share it.
export class Signal extends Data.Class<{
  readonly name: string
  readonly reported: boolean
  readonly detections: ReadonlyArray<Detection>
  readonly examples: ReadonlyArray<RefactorExample>
}> {}

// WiringSignals records match state and signals because unmatched is not empty.
export class WiringSignals extends Data.Class<{
  readonly matched: boolean
  readonly signals: ReadonlyArray<Signal>
}> {}
