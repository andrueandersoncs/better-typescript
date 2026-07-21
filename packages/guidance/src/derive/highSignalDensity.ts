import { Array, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  byFile,
  makeCountSummary,
  deriveSignals,
  evidenceFromCounts,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { FileDetections, NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../definePolicy.js"

export const highSignalDensityExamples = packageExamples("high-signal-density")

const makeDensityAdvice = (file: FileDetections) => {
  const summary = makeCountSummary(file.elements)
  const policyEvidence = evidenceFromCounts(summary.countsByPolicy)
  const signalsItem = makeEvidenceItem("signals", summary.total)
  const evidence = Array.prepend(policyEvidence, signalsItem)
  const location = makeAdviceLocation(file.path)
  const examples = highSignalDensityExamples

  return Advice.make({
    location,
    level: "file",
    title: "high signal density",
    remediation:
      "Signal density here signals an architectural mismatch, not local style slips. " +
      "Restructure the file around the Effect runtime (state in Ref, SynchronizedRef, or " +
      "PubSub; wiring in Layer; one runtime entry at the boundary) instead of fixing " +
      "signals one at a time — the inversion dissolves most of them.",
    evidence,
    examples
  })
}

const denseFileAdvice = (signals: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> =>
  pipe(
    byFile(signals),
    Array.filter((file) => file.elements.length >= 10),
    Array.map(makeDensityAdvice)
  )

export const highSignalDensity = deriveSignals(denseFileAdvice)
