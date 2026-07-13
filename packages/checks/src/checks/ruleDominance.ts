import { Array, Stream } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  adviceLocation,
  countSummary,
  deriveSignals,
  dominantCheckEvidence,
  evidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"

const dominanceAdvice = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const summary = countSummary(elements)
  const dominantEvidence = dominantCheckEvidence(2)(5)(5)(summary)
  const hasEnoughSignals = summary.total >= 25
  const hasDominantCheck = dominantEvidence.length > 0
  const signalsEvidence = Array.make(hasEnoughSignals, hasDominantCheck)
  const isDominated = Array.every(signalsEvidence, Boolean)
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

  return isDominated ? Array.of(advice) : Array.empty()
}

export const ruleDominance = deriveSignals(dominanceAdvice)
