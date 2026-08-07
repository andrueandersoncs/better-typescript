import { Array, HashMap, pipe } from "effect"
import type { EvidenceItem } from "./evidenceItem.js"
import { evidenceOrder } from "./evidenceOrder.js"
import { makeCountEntryEvidence } from "./makeCountEntryEvidence.js"

export const evidenceFromCounts = (
  counts: HashMap.HashMap<string, number>
): ReadonlyArray<EvidenceItem> => {
  const items = pipe(HashMap.toEntries(counts), Array.map(makeCountEntryEvidence))

  return Array.sort(items, evidenceOrder)
}
