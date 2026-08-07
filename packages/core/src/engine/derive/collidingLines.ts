import { Array, HashSet, Order, Record, Tuple } from "effect"
import { EvidenceItem } from "./evidenceItem.js"
import type { NamedDetection } from "./namedDetection.js"
import { namedDetectionName } from "./namedDetectionName.js"
import { byMeasure } from "./byMeasure.js"

const lineKey = (named: NamedDetection) => `${named.detection.location.line}`

const hasDistinctPolicies = (entry: readonly [string, ReadonlyArray<NamedDetection>]) => {
  const elements = Tuple.get(entry, 1)
  const names = Array.map(elements, namedDetectionName)
  const distinct = HashSet.fromIterable(names)

  return HashSet.size(distinct) > 1
}

const makeCollisionEvidence = (entry: readonly [string, ReadonlyArray<NamedDetection>]) => {
  const line = Tuple.get(entry, 0)
  const elements = Tuple.get(entry, 1)
  const names = Array.map(elements, namedDetectionName)
  const distinct = HashSet.fromIterable(names)
  const nameList = Array.fromIterable(distinct)
  const sortedNames = Array.sort(nameList, Order.String)
  const measure = `line ${line}: ${Array.join(sortedNames, " + ")}`

  return EvidenceItem.make({ measure: measure, count: elements.length })
}

export const collidingLines = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<EvidenceItem> => {
  const grouped = Array.groupBy(elements, lineKey)
  const entries = Record.toEntries(grouped)
  const collisions = Array.filter(entries, hasDistinctPolicies)
  const evidence = Array.map(collisions, makeCollisionEvidence)

  return Array.sort(evidence, byMeasure)
}
