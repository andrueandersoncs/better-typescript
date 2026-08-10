import type { Detection } from "./subjectA.js"

// Signal is one independently meaningful data subject of the equality chain.
export class Signal {
  readonly name = "b"
  readonly detections: ReadonlyArray<Detection> = []
}
