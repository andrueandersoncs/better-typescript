import { Array, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  adviceLocation,
  byFile,
  countSummary,
  deriveSignals,
  evidenceFromCounts,
  evidenceItem
} from "@better-typescript/core/engine/derive"
import type { FileDetections, NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../defineCheck.js"

export const highSignalDensityExamples = packageExamples("high-signal-density")

const densityAdvice = (file: FileDetections): Advice => {
  const summary = countSummary(file.elements)
  const checkEvidence = evidenceFromCounts(summary.countsByCheck)
  const signalsItem = evidenceItem("signals", summary.total)
  const evidence = Array.prepend(checkEvidence, signalsItem)
  const location = adviceLocation(file.path)
  const examples = highSignalDensityExamples()

  return new Advice({
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
    Array.map(densityAdvice)
  )

export const highSignalDensity = deriveSignals(denseFileAdvice)
