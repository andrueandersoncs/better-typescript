import { Array, HashMap, HashSet, Record, Tuple, pipe } from "effect"
import { CountSummary } from "./countSummary.js"
import { FileDetections } from "./fileDetections.js"
import type { NamedDetection } from "./namedDetection.js"
import { namedDetectionName } from "./namedDetectionName.js"
import { addCount } from "./addCount.js"

const detectionPath = (named: NamedDetection) => named.detection.location.path

const makeFileDetections = (entry: readonly [string, ReadonlyArray<NamedDetection>]) => {
  const path = Tuple.get(entry, 0)
  const elements = Tuple.get(entry, 1)

  return FileDetections.make({ path, elements })
}

export const byFile = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<FileDetections> => {
  const grouped = Array.groupBy(elements, detectionPath)
  const entries = Record.toEntries(grouped)

  return Array.map(entries, makeFileDetections)
}

const addDetectionCount = (counts: HashMap.HashMap<string, number>, element: NamedDetection) =>
  addCount(element.name)(counts)

const addNameCount = (counts: HashMap.HashMap<string, number>, name: string) =>
  addCount(name)(counts)

const addFilePolicyCounts = (counts: HashMap.HashMap<string, number>, file: FileDetections) => {
  const distinctNames = pipe(
    file.elements,
    Array.map(namedDetectionName),
    HashSet.fromIterable,
    Array.fromIterable
  )

  return Array.reduce(distinctNames, counts, addNameCount)
}

export const makeCountSummary = (elements: ReadonlyArray<NamedDetection>) => {
  const files = byFile(elements)
  const emptyCounts = HashMap.empty<string, number>()
  const countsByPolicy = Array.reduce(elements, emptyCounts, addDetectionCount)
  const filesByPolicy = Array.reduce(files, emptyCounts, addFilePolicyCounts)

  return CountSummary.make({
    total: elements.length,
    fileCount: files.length,
    countsByPolicy,
    filesByPolicy
  })
}
