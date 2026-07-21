import { Array, Option, Struct, pipe, flow } from "effect"
import type { Detection } from "../location/data.js"
import { detectionEquals } from "../location/location.js"
import { strictEqual } from "../equivalence.js"
import { Signal, WiringSignals } from "./data.js"

// Lookup stays on the materialized batch because derive helpers need random access to siblings.
export const signalOf =
  (signals: ReadonlyArray<Signal>) =>
  (name: string): ReadonlyArray<Detection> => {
    const hasName = flow(Struct.get<Signal, "name">("name"), strictEqual(name))

    return pipe(
      Array.findFirst(signals, hasName),
      Option.map(Struct.get("detections")),
      Option.getOrElse(Array.empty<Detection>)
    )
  }

const detectionsEquivalence = Array.makeEquivalence(detectionEquals)

// Name plus detections is the watch change gate because policy and examples are configuration.
export const signalEquals = (a: Signal, b: Signal) => {
  const sameName = strictEqual(b.name)(a.name)
  const sameDetections = detectionsEquivalence(a.detections, b.detections)

  return sameName && sameDetections
}

const signalArrayEquivalence = Array.makeEquivalence(signalEquals)

// Match state participates because a newly matched or removed glob scope must reach derivation.
export const wiringSignalsEquals = (a: WiringSignals, b: WiringSignals) => {
  const sameMatchState = strictEqual(b.matched)(a.matched)
  const sameSignals = signalArrayEquivalence(a.signals, b.signals)

  return sameMatchState && sameSignals
}

// One array equivalence exists because watch change gating compares whole signal batches.
export const wiringSignalsArrayEquivalence = Array.makeEquivalence(wiringSignalsEquals)
