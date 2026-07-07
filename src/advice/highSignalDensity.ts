import { Array, Stream, pipe } from "effect"
import {
  AdviceElement,
  adviceLocation,
  byFile,
  countSummary,
  deriveSignals,
  evidenceFromCounts,
  evidenceItem
} from "../detectors/summary.js"
import type { FileDetections, NamedDetection } from "../detectors/summary.js"

const densityAdvice = (file: FileDetections): AdviceElement => {
  const summary = countSummary(file.elements)
  const ruleEvidence = evidenceFromCounts(summary.countsByRule)
  const signalsItem = evidenceItem("signals", summary.total)
  const evidence = Array.prepend(ruleEvidence, signalsItem)
  const location = adviceLocation(file.path)

  return new AdviceElement({
    location,
    level: "file",
    title: "high signal density",
    remediation:
      "Signal density here signals an architectural mismatch, not local style slips. " +
      "Restructure the file around the Effect runtime (state in Ref, SynchronizedRef, or " +
      "PubSub; wiring in Layer; one runtime entry at the boundary) instead of fixing " +
      "signals one at a time — the inversion dissolves most of them.",
    evidence
  })
}

const denseFileAdvice = (
  signals: ReadonlyArray<NamedDetection>
): ReadonlyArray<AdviceElement> =>
  pipe(
    byFile(signals),
    Array.filter((file) => file.elements.length >= 10),
    Array.map(densityAdvice)
  )

export const highSignalDensity = (
  signals: Stream.Stream<NamedDetection, Error>
): Stream.Stream<AdviceElement, Error> =>
  deriveSignals(denseFileAdvice)(signals)
