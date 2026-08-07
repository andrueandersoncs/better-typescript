import { Tuple } from "effect"
import { EvidenceItem } from "./evidenceItem.js"

export const makeCountEntryEvidence = (entry: readonly [string, number]) => {
  const measure = Tuple.get(entry, 0)
  const count = Tuple.get(entry, 1)

  return EvidenceItem.make({ measure: measure, count: count })
}
