import { Array, Data } from "effect"
import type { RefactorExampleSource } from "../example/refactorExampleSource.js"
import { detectionsEquivalence, type Detection } from "../location/detectionData.js"
import { strictEqual } from "../equivalence/strictEqual.js"

// Signal is one named policy result because rendering and advice share it.
export class Signal extends Data.Class<{
  readonly name: string
  readonly reported: boolean
  readonly detections: ReadonlyArray<Detection>
  readonly examples: RefactorExampleSource
}> {}

// Name plus detections is the watch change gate because policy and examples are configuration.
export const signalEquals = (a: Signal, b: Signal) => {
  const sameName = strictEqual(b.name)(a.name)
  const sameDetections = detectionsEquivalence(a.detections, b.detections)

  return sameName && sameDetections
}

// One array equivalence lives here because watch gating compares whole signal batches.
export const signalArrayEquivalence = Array.makeEquivalence(signalEquals)
