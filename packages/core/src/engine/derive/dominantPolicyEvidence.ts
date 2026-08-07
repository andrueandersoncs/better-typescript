import { Array, HashMap, Tuple } from "effect"
import type { CountSummary } from "./countSummary.js"
import type { EvidenceItem } from "./evidenceItem.js"
import { countAt } from "./countAt.js"
import { evidenceOrder } from "./evidenceOrder.js"
import { makeCountEntryEvidence } from "./makeCountEntryEvidence.js"

export const dominantPolicyEvidence =
  (numerator: number) =>
  (denominator: number) =>
  (minSpread: number) =>
  (summary: CountSummary): ReadonlyArray<EvidenceItem> => {
    const entries = HashMap.toEntries(summary.countsByPolicy)

    const dominant = Array.filter(entries, (entry) => {
      const measure = Tuple.get(entry, 0)
      const count = Tuple.get(entry, 1)
      const spread = countAt(summary.filesByPolicy)(measure)
      const holdsShare = count * denominator >= summary.total * numerator

      return holdsShare && spread >= minSpread
    })

    const evidence = Array.map(dominant, makeCountEntryEvidence)

    return Array.sort(evidence, evidenceOrder)
  }
