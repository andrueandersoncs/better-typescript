import { Array } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { makeCountSummary } from "@better-typescript/core/engine/derive/byFile"
import { deriveSignals } from "@better-typescript/core/engine/derive/deriveSignals"
import { dominantPolicyEvidence } from "@better-typescript/core/engine/derive/dominantPolicyEvidence"
import { type NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { makePackageExamples } from "../makePackageExamples.js"

export const ruleDominanceExamples = makePackageExamples("rule-dominance")

const dominanceAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const summary = makeCountSummary(elements)
  const dominantEvidence = dominantPolicyEvidence(2)(5)(5)(summary)
  const hasEnoughSignals = summary.total >= 25
  const hasDominantPolicy = dominantEvidence.length > 0
  const signalsEvidence = Array.make(hasEnoughSignals, hasDominantPolicy)
  const isDominated = Array.every(signalsEvidence, Boolean)
  const location = Location.make({ path: "project" })
  const signalsItem = EvidenceItem.make({ measure: "signals", count: summary.total })
  const evidence = Array.prepend(dominantEvidence, signalsItem)

  const advice = Advice.make({
    location,
    level: "project",
    title: "one rule dominates the run",
    remediation:
      "A single rule produces most of the signals across many files: the pattern is " +
      "systemic, not local. Plan one mechanical migration — a codemod and a single review " +
      "— instead of fixing occurrences file by file.",
    evidence,
    examples: ruleDominanceExamples
  })

  return isDominated ? Array.of(advice) : Array.empty()
}

export const ruleDominance = deriveSignals(dominanceAdvice)
