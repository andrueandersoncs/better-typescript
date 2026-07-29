import { Array } from "effect"
import { Advice, EvidenceItem } from "@better-typescript/core/engine/derive/data"
import { Location } from "@better-typescript/core/engine/location/data"
import {
  makeCountSummary,
  deriveSignals,
  dominantPolicyEvidence
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { makePackageExamples } from "../definePolicy.js"

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
  const examples = ruleDominanceExamples

  const advice = Advice.make({
    location,
    level: "project",
    title: "one rule dominates the run",
    remediation:
      "A single rule produces most of the signals across many files: the pattern is " +
      "systemic, not local. Plan one mechanical migration — a codemod and a single review " +
      "— instead of fixing occurrences file by file.",
    evidence,
    examples
  })

  return isDominated ? Array.of(advice) : Array.empty()
}

export const ruleDominance = deriveSignals(dominanceAdvice)
