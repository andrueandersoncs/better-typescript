import { Array, Stream } from "effect"
import {
  AdviceElement,
  adviceLocation,
  countSummary,
  deriveSignals,
  dominantRuleEvidence,
  evidenceItem
} from "../detectors/summary.js"
import type { NamedDetection } from "../detectors/summary.js"

const dominanceAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<AdviceElement> => {
  const summary = countSummary(elements)
  const dominantEvidence = dominantRuleEvidence(2)(5)(5)(summary)
  const hasEnoughSignals = summary.total >= 25
  const hasDominantRule = dominantEvidence.length > 0
  const isDominated = [hasEnoughSignals, hasDominantRule].every(Boolean)
  const location = adviceLocation("project")
  const signalsItem = evidenceItem("signals", summary.total)
  const evidence = Array.prepend(dominantEvidence, signalsItem)
  const advice = new AdviceElement({
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
): Stream.Stream<AdviceElement, Error> =>
  deriveSignals(dominanceAdvice)(signals)
