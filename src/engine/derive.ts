import {
  Array,
  Chunk,
  Effect,
  Function,
  HashMap,
  HashSet,
  Option,
  Order,
  Record,
  Schema,
  Stream,
  Struct,
  pipe
} from "effect"
import { Location } from "./location.js"
import { Detection } from "./check.js"

export type AdviceLevel = "file" | "directory" | "project"

export class EvidenceItem extends Schema.Class<EvidenceItem>("EvidenceItem")({
  measure: Schema.String,
  count: Schema.Number
}) {}

const adviceLevelSchema = Schema.Literal("file", "directory", "project")
const evidenceArraySchema = Schema.Array(EvidenceItem)

export class Advice extends Schema.Class<Advice>("Advice")({
  location: Location,
  level: adviceLevelSchema,
  title: Schema.String,
  remediation: Schema.String,
  evidence: evidenceArraySchema
}) {}

export class NamedDetection extends Schema.Class<NamedDetection>(
  "NamedDetection"
)({
  name: Schema.String,
  detection: Detection
}) {}

export const collectSignals = <A>(
  signals: Stream.Stream<A, Error>
): Effect.Effect<ReadonlyArray<A>, Error> =>
  pipe(Stream.runCollect(signals), Effect.map(Chunk.toReadonlyArray))

// A derivation folds completed upstream signals into emissions of its own.
export const deriveSignals =
  <A, B>(derive: (elements: ReadonlyArray<A>) => ReadonlyArray<B>) =>
  (signals: Stream.Stream<A, Error>): Stream.Stream<B, Error> =>
    pipe(
      collectSignals(signals),
      Effect.map(derive),
      Effect.map(Stream.fromIterable),
      Stream.unwrap
    )

const namedDetectionArray = Schema.Array(NamedDetection)

export class FileDetections extends Schema.Class<FileDetections>(
  "FileDetections"
)({
  path: Schema.String,
  elements: namedDetectionArray
}) {}

export class CountSummary extends Schema.Class<CountSummary>("CountSummary")({
  total: Schema.Number,
  fileCount: Schema.Number,
  countsByCheck: Schema.Any,
  filesByCheck: Schema.Any
}) {
  declare readonly countsByCheck: HashMap.HashMap<string, number>
  declare readonly filesByCheck: HashMap.HashMap<string, number>
}

const namedDetectionName = Struct.get("name")

export const countAt =
  (counts: HashMap.HashMap<string, number>) =>
  (key: string): number =>
    pipe(HashMap.get(counts, key), Option.getOrElse(Function.constant(0)))

const addCount =
  (key: string) =>
  (
    counts: HashMap.HashMap<string, number>
  ): HashMap.HashMap<string, number> => {
    const next = countAt(counts)(key) + 1

    return HashMap.set(counts, key, next)
  }

export const namedDetection =
  (name: string) =>
  (detection: Detection): NamedDetection =>
    new NamedDetection({ name, detection })

const detectionPath = (named: NamedDetection): string =>
  named.detection.location.path

const fileDetections = (
  entry: readonly [string, ReadonlyArray<NamedDetection>]
): FileDetections => new FileDetections({ path: entry[0], elements: entry[1] })

export const byFile = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<FileDetections> => {
  const grouped = Array.groupBy(elements, detectionPath)
  const entries = Record.toEntries(grouped)

  return Array.map(entries, fileDetections)
}

const parentAt =
  (segments: ReadonlyArray<string>) =>
  (segment: string, index: number): string =>
    segments.slice(0, index + 1).join("/")

export const parentDirectories = (filePath: string): ReadonlyArray<string> => {
  const normalized = filePath.replaceAll("\\", "/")
  const segments = normalized.split("/")
  const parents = segments.slice(0, -1)

  return parents.map(parentAt(parents))
}

const addDetectionCount = (
  counts: HashMap.HashMap<string, number>,
  element: NamedDetection
): HashMap.HashMap<string, number> => addCount(element.name)(counts)

const addNameCount = (
  counts: HashMap.HashMap<string, number>,
  name: string
): HashMap.HashMap<string, number> => addCount(name)(counts)

const addFileCheckCounts = (
  counts: HashMap.HashMap<string, number>,
  file: FileDetections
): HashMap.HashMap<string, number> => {
  const distinctNames = pipe(
    file.elements,
    Array.map(namedDetectionName),
    HashSet.fromIterable,
    Array.fromIterable
  )

  return Array.reduce(distinctNames, counts, addNameCount)
}

export const countSummary = (
  elements: ReadonlyArray<NamedDetection>
): CountSummary => {
  const files = byFile(elements)
  const emptyCounts = HashMap.empty<string, number>()
  const countsByCheck = Array.reduce(elements, emptyCounts, addDetectionCount)
  const filesByCheck = Array.reduce(files, emptyCounts, addFileCheckCounts)

  return new CountSummary({
    total: elements.length,
    fileCount: files.length,
    countsByCheck,
    filesByCheck
  })
}

const descendingNumber = Order.reverse(Order.number)
const byCountDescending: Order.Order<EvidenceItem> = Order.mapInput(
  descendingNumber,
  Struct.get("count")
)
const byMeasure: Order.Order<EvidenceItem> = Order.mapInput(
  Order.string,
  Struct.get("measure")
)
export const evidenceOrder: Order.Order<EvidenceItem> = Order.combine(
  byCountDescending,
  byMeasure
)

export const evidenceItem = (measure: string, count: number): EvidenceItem =>
  new EvidenceItem({ measure, count })

export const adviceLocation = (path: string): Location => new Location({ path })

export const detectionAtPath =
  (path: string) =>
  (element: Detection): boolean =>
    element.location.path === path

export const detectionsAtPath =
  (path: string) =>
  (elements: ReadonlyArray<Detection>): ReadonlyArray<Detection> =>
    elements.filter(detectionAtPath(path))

export const countDetectionsAtPath =
  (path: string) =>
  (elements: ReadonlyArray<Detection>): number =>
    detectionsAtPath(path)(elements).length

const countEntryEvidence = (entry: readonly [string, number]): EvidenceItem =>
  evidenceItem(entry[0], entry[1])

export const evidenceFromCounts = (
  counts: HashMap.HashMap<string, number>
): ReadonlyArray<EvidenceItem> =>
  pipe(
    HashMap.toEntries(counts),
    Array.map(countEntryEvidence),
    Array.sort(evidenceOrder)
  )

const lineKey = (named: NamedDetection): string =>
  `${named.detection.location.line}`

const hasDistinctChecks = (
  entry: readonly [string, ReadonlyArray<NamedDetection>]
): boolean => {
  const names = entry[1].map(namedDetectionName)
  const distinct = HashSet.fromIterable(names)

  return HashSet.size(distinct) > 1
}

const collisionEvidence = (
  entry: readonly [string, ReadonlyArray<NamedDetection>]
): EvidenceItem => {
  const names = entry[1].map(namedDetectionName)
  const distinct = HashSet.fromIterable(names)
  const nameList = Array.fromIterable(distinct)
  const sortedNames = Array.sort(nameList, Order.string)
  const measure = `line ${entry[0]}: ${sortedNames.join(" + ")}`

  return evidenceItem(measure, entry[1].length)
}

export const collidingLines = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<EvidenceItem> => {
  const grouped = Array.groupBy(elements, lineKey)
  const entries = Record.toEntries(grouped)
  const collisions = entries.filter(hasDistinctChecks)
  const evidence = collisions.map(collisionEvidence)

  return Array.sort(evidence, byMeasure)
}

const dominantEntry =
  (summary: CountSummary) =>
  (numerator: number) =>
  (denominator: number) =>
  (minSpread: number) =>
  (entry: readonly [string, number]): boolean => {
    const spread = countAt(summary.filesByCheck)(entry[0])
    const holdsShare = entry[1] * denominator >= summary.total * numerator

    return holdsShare && spread >= minSpread
  }

export const dominantCheckEvidence =
  (numerator: number) =>
  (denominator: number) =>
  (minSpread: number) =>
  (summary: CountSummary): ReadonlyArray<EvidenceItem> => {
    const entries = HashMap.toEntries(summary.countsByCheck)
    const dominant = entries.filter(
      dominantEntry(summary)(numerator)(denominator)(minSpread)
    )
    const evidence = dominant.map(countEntryEvidence)

    return Array.sort(evidence, evidenceOrder)
  }
