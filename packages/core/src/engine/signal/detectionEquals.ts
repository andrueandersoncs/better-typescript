import { Array, Equal } from "effect"
import type { Detection } from "../location/detectionData.js"
import { strictEqual } from "../equivalence/strictEqual.js"
import type { Signal } from "./data.js"
import type { WiringSignals } from "./wiringSignals.js"

export const detectionEquals = (a: Detection, b: Detection) => {
  const samePath = strictEqual(b.location.path)(a.location.path)
  const sameLine = strictEqual(b.location.line)(a.location.line)
  const sameColumn = strictEqual(b.location.column)(a.location.column)
  const sameMessage = strictEqual(b.message)(a.message)
  const sameHint = strictEqual(b.hint)(a.hint)
  const bothStructural = Equal.isEqual(a.data) && Equal.isEqual(b.data)
  const identical = strictEqual(b.data)(a.data)
  const sameData = bothStructural ? Equal.equals(a.data, b.data) : identical
  const conditions = Array.make(samePath, sameLine, sameColumn, sameMessage, sameHint, sameData)

  return Array.every(conditions, Boolean)
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
