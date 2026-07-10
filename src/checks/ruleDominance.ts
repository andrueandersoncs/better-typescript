import { Array, Stream } from "effect"
import {
  Advice,
  adviceLocation,
  countSummary,
  deriveSignals,
  dominantCheckEvidence,
  evidenceItem
} from "../engine/derive.js"
import type { NamedDetection } from "../engine/derive.js"

const dominanceAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const summary = countSummary(elements)
  const dominantEvidence = dominantCheckEvidence(2)(5)(5)(summary)
  const hasEnoughSignals = summary.total >= 25
  const hasDominantCheck = dominantEvidence.length > 0
  const isDominated = [hasEnoughSignals, hasDominantCheck].every(Boolean)
  const location = adviceLocation("project")
  const signalsItem = evidenceItem("signals", summary.total)
  const evidence = Array.prepend(dominantEvidence, signalsItem)
  const advice = new Advice({
    location,
    level: "project",
    title: "one rule dominates the run",
    remediation:
      "A single rule produces most of the signals across many files: the pattern is " +
      "systemic, not local. Plan one mechanical migration — a codemod and a single review " +
      "— instead of fixing occurrences file by file.",
    evidence
  })

  return isDominated ? [advice] : []
}

export const ruleDominance = (
  signals: Stream.Stream<NamedDetection, Error>
): Stream.Stream<Advice, Error> => deriveSignals(dominanceAdvice)(signals)
