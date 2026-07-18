import {
  Array,
  Effect,
  Function,
  HashMap,
  HashSet,
  Option,
  Order,
  Record,
  Stream,
  Struct,
  pipe
} from "effect"
import { formatRefactorExample } from "../example/example.js"
import type { RefactorExample } from "../example/data.js"
import { Location } from "../location/data.js"
import type { Detection } from "../location/data.js"
import { CountSummary, Advice, EvidenceItem, FileDetections, NamedDetection } from "./data.js"

export const collectSignals: <A, E, R>(
  signals: Stream.Stream<A, E, R>
) => Effect.Effect<ReadonlyArray<A>, E, R> = Stream.runCollect

export const deriveSignals =
  <A, B>(derive: (elements: ReadonlyArray<A>) => ReadonlyArray<B>) =>
  <E, R>(signals: Stream.Stream<A, E, R>): Stream.Stream<B, E, R> => {
    const collected = collectSignals(signals)
    const derived = Effect.map(collected, derive)

    return Stream.fromArrayEffect(derived)
  }

// The name pairs with its detection here because derive joins detections by check name.
export const makeNamedDetection = (name: string) => (detectionValue: Detection) =>
  new NamedDetection({ name, detection: detectionValue })

const namedDetectionName = Struct.get<NamedDetection, "name">("name")

export const countAt = (counts: HashMap.HashMap<string, number>) => (key: string) =>
  pipe(HashMap.get(counts, key), Option.getOrElse(Function.constant(0)))

const addCount = (key: string) => (counts: HashMap.HashMap<string, number>) => {
  const next = countAt(counts)(key) + 1

  return HashMap.set(counts, key, next)
}

const detectionPath = (named: NamedDetection) => named.detection.location.path

const makeFileDetections = (entry: readonly [string, ReadonlyArray<NamedDetection>]) =>
  new FileDetections({ path: entry[0], elements: entry[1] })

export const byFile = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<FileDetections> => {
  const grouped = Array.groupBy(elements, detectionPath)
  const entries = Record.toEntries(grouped)

  return Array.map(entries, makeFileDetections)
}

export const parentDirectories = (filePath: string): ReadonlyArray<string> => {
  const normalized = filePath.replaceAll("\\", "/")
  const segments = normalized.split("/")
  const parents = Array.dropRight(segments, 1)

  return Array.map(parents, (_segment, index) => {
    const taken = Array.take(parents, index + 1)
    return Array.join(taken, "/")
  })
}

const addDetectionCount = (counts: HashMap.HashMap<string, number>, element: NamedDetection) =>
  addCount(element.name)(counts)

const addNameCount = (counts: HashMap.HashMap<string, number>, name: string) =>
  addCount(name)(counts)

const addFileCheckCounts = (counts: HashMap.HashMap<string, number>, file: FileDetections) => {
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
  const countsByCheck = Array.reduce(elements, emptyCounts, addDetectionCount)
  const filesByCheck = Array.reduce(files, emptyCounts, addFileCheckCounts)

  return new CountSummary({
    total: elements.length,
    fileCount: files.length,
    countsByCheck,
    filesByCheck
  })
}

const descendingNumber = Order.flip(Order.Number)

const byCountDescending: Order.Order<EvidenceItem> = Order.mapInput(
  descendingNumber,
  Struct.get("count")
)

const byMeasure: Order.Order<EvidenceItem> = Order.mapInput(Order.String, Struct.get("measure"))

export const evidenceOrder = Order.combine(byCountDescending, byMeasure)

export const makeEvidenceItem = (measure: string, count: number) =>
  new EvidenceItem({ measure, count })

export const makeAdviceLocation = (path: string) => new Location({ path })

const makeCountEntryEvidence = (entry: readonly [string, number]) =>
  makeEvidenceItem(entry[0], entry[1])

export const evidenceFromCounts = (
  counts: HashMap.HashMap<string, number>
): ReadonlyArray<EvidenceItem> => {
  const items = pipe(HashMap.toEntries(counts), Array.map(makeCountEntryEvidence))

  return Array.sort(items, evidenceOrder)
}

const lineKey = (named: NamedDetection) => `${named.detection.location.line}`

const hasDistinctChecks = (entry: readonly [string, ReadonlyArray<NamedDetection>]) => {
  const names = Array.map(entry[1], namedDetectionName)
  const distinct = HashSet.fromIterable(names)

  return HashSet.size(distinct) > 1
}

const makeCollisionEvidence = (entry: readonly [string, ReadonlyArray<NamedDetection>]) => {
  const names = Array.map(entry[1], namedDetectionName)
  const distinct = HashSet.fromIterable(names)
  const nameList = Array.fromIterable(distinct)
  const sortedNames = Array.sort(nameList, Order.String)
  const measure = `line ${entry[0]}: ${Array.join(sortedNames, " + ")}`

  return makeEvidenceItem(measure, entry[1].length)
}

export const collidingLines = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<EvidenceItem> => {
  const grouped = Array.groupBy(elements, lineKey)
  const entries = Record.toEntries(grouped)
  const collisions = Array.filter(entries, hasDistinctChecks)
  const evidence = Array.map(collisions, makeCollisionEvidence)

  return Array.sort(evidence, byMeasure)
}

export const dominantCheckEvidence =
  (numerator: number) =>
  (denominator: number) =>
  (minSpread: number) =>
  (summary: CountSummary): ReadonlyArray<EvidenceItem> => {
    const entries = HashMap.toEntries(summary.countsByCheck)

    const dominant = Array.filter(entries, (entry) => {
      const spread = countAt(summary.filesByCheck)(entry[0])
      const holdsShare = entry[1] * denominator >= summary.total * numerator

      return holdsShare && spread >= minSpread
    })

    const evidence = Array.map(dominant, makeCountEntryEvidence)

    return Array.sort(evidence, evidenceOrder)
  }

export const evidenceText = (item: EvidenceItem) => `  evidence: ${item.measure}: ${item.count}`

const adviceLevelRanks = { file: 0, directory: 1, project: 2 } as const

export const adviceLevelRank = (advice: Advice): number => adviceLevelRanks[advice.level]

export const advicePath = (advice: Advice) =>
  advice.level === "project" ? "project" : advice.location.path

const byAdviceLevel = Order.mapInput(Order.Number, adviceLevelRank)
const byAdvicePath = Order.mapInput(Order.String, advicePath)
export const adviceOrder = Order.combine(byAdviceLevel, byAdvicePath)

export const adviceHeader = (advice: Advice) => {
  const pathLabel = advicePath(advice)

  return `${pathLabel} [${advice.level}] — ${advice.title}`
}

export const adviceText =
  (examples: ReadonlyArray<RefactorExample>) =>
  (advice: Advice): string => {
    const header = adviceHeader(advice)
    const remediation = `  fix: ${advice.remediation}`
    const exampleText = Array.map(examples, formatRefactorExample)
    const evidence = Array.map(advice.evidence, evidenceText)
    const prefixLines = Array.make(header, remediation)
    const remediationLines = Array.appendAll(prefixLines, exampleText)
    const lines = Array.appendAll(remediationLines, evidence)

    return Array.join(lines, "\n")
  }

export const isFileLevelAdvice = (advice: Advice) => advice.level === "file"

export const fileAdvicePath = (advice: Advice) => advice.location.path
