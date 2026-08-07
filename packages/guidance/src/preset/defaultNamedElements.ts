import { Array, Struct } from "effect"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import type { NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"

const defaultNameReportedDetections = (signal: Signal) =>
  Array.map(signal.detections, makeNamedDetection(signal.name))

export const defaultNamedElements = (
  signals: ReadonlyArray<Signal>
): ReadonlyArray<NamedDetection> => {
  const reportedSignals = Array.filter(signals, Struct.get("reported"))

  return Array.flatMap(reportedSignals, defaultNameReportedDetections)
}
