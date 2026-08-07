import { Data } from "effect"
import type { RefactorExampleSource } from "../example/refactorExampleSource.js"
import type { Detection } from "../location/detectionData.js"

// Signal is one named policy result because rendering and advice share it.
export class Signal extends Data.Class<{
  readonly name: string
  readonly reported: boolean
  readonly detections: ReadonlyArray<Detection>
  readonly examples: RefactorExampleSource
}> {}
