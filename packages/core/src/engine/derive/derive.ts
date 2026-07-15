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
import { Location } from "../location/data.js"
import { AdviceReportKey, ReportBlock } from "../report/data.js"
import { CountSummary, Advice, EvidenceItem, FileDetections, NamedDetection } from "./data.js"

export const collectSignals: <A>(
  signals: Stream.Stream<A, Error>
) => Effect.Effect<ReadonlyArray<A>, Error> = Stream.runCollect

export const deriveSignals =
  <A, B>(derive: (elements: ReadonlyArray<A>) => ReadonlyArray<B>) =>
  (signals: Stream.Stream<A, Error>): Stream.Stream<B, Error> =>
    pipe(collectSignals(signals), Effect.map(derive), Stream.fromArrayEffect)

const namedDetectionName = Struct.get<NamedDetection, "name">("name")

export const countAt =
  (counts: HashMap.HashMap<string, number>) =>
  (key: string): number =>
    pipe(HashMap.get(counts, key), Option.getOrElse(Function.constant(0)))

const addCount =
  (key: string) =>
  (counts: HashMap.HashMap<string, number>): HashMap.HashMap<string, number> => {
    const next = countAt(counts)(key) + 1

    return HashMap.set(counts, key, next)
  }

const detectionPath = (named: NamedDetection): string => named.detection.location.path

const fileDetections = (entry: readonly [string, ReadonlyArray<NamedDetection>]): FileDetections =>
  new FileDetections({ path: entry[0], elements: entry[1] })

export const byFile = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<FileDetections> => {
  const grouped = Array.groupBy(elements, detectionPath)
  const entries = Record.toEntries(grouped)

  return Array.map(entries, fileDetections)
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

export const countSummary = (elements: ReadonlyArray<NamedDetection>): CountSummary => {
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

export const evidenceOrder: Order.Order<EvidenceItem> = Order.combine(byCountDescending, byMeasure)

export const evidenceItem = (measure: string, count: number): EvidenceItem =>
  new EvidenceItem({ measure, count })

export const adviceLocation = (path: string): Location => new Location({ path })

const countEntryEvidence = (entry: readonly [string, number]): EvidenceItem =>
  evidenceItem(entry[0], entry[1])

export const evidenceFromCounts = (
  counts: HashMap.HashMap<string, number>
): ReadonlyArray<EvidenceItem> =>
  pipe(HashMap.toEntries(counts), Array.map(countEntryEvidence), Array.sort(evidenceOrder))

const lineKey = (named: NamedDetection): string => `${named.detection.location.line}`

const hasDistinctChecks = (entry: readonly [string, ReadonlyArray<NamedDetection>]): boolean => {
  const names = Array.map(entry[1], namedDetectionName)
  const distinct = HashSet.fromIterable(names)

  return HashSet.size(distinct) > 1
}

const collisionEvidence = (
  entry: readonly [string, ReadonlyArray<NamedDetection>]
): EvidenceItem => {
  const names = Array.map(entry[1], namedDetectionName)
  const distinct = HashSet.fromIterable(names)
  const nameList = Array.fromIterable(distinct)
  const sortedNames = Array.sort(nameList, Order.String)
  const measure = `line ${entry[0]}: ${Array.join(sortedNames, " + ")}`

  return evidenceItem(measure, entry[1].length)
}

export const collidingLines = (
  elements: ReadonlyArray<NamedDetection>
): ReadonlyArray<EvidenceItem> => {
  const grouped = Array.groupBy(elements, lineKey)
  const entries = Record.toEntries(grouped)
  const collisions = Array.filter(entries, hasDistinctChecks)
  const evidence = Array.map(collisions, collisionEvidence)

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

    const evidence = Array.map(dominant, countEntryEvidence)

    return Array.sort(evidence, evidenceOrder)
  }

export const evidenceText = (item: EvidenceItem): string =>
  `  evidence: ${item.measure}: ${item.count}`

const adviceLevelRanks = { file: 0, directory: 1, project: 2 } as const

export const adviceLevelRank = (advice: Advice): number => adviceLevelRanks[advice.level]

export const advicePath = (advice: Advice): string =>
  advice.level === "project" ? "project" : advice.location.path

const byAdviceLevel = Order.mapInput(Order.Number, adviceLevelRank)
const byAdvicePath = Order.mapInput(Order.String, advicePath)
export const adviceOrder = Order.combine(byAdviceLevel, byAdvicePath)

export const adviceHeader = (advice: Advice): string => {
  const pathLabel = advicePath(advice)

  return `${pathLabel} [${advice.level}] — ${advice.title}`
}

export const adviceText = (advice: Advice): string => {
  const header = adviceHeader(advice)
  const remediation = `  fix: ${advice.remediation}`
  const examples = Array.map(advice.examples, formatRefactorExample)
  const evidence = Array.map(advice.evidence, evidenceText)
  const prefixLines = Array.make(header, remediation)
  const remediationLines = Array.appendAll(prefixLines, examples)
  const lines = Array.appendAll(remediationLines, evidence)

  return Array.join(lines, "\n")
}

const reportIdentity = (kind: string, parts: ReadonlyArray<string>): string =>
  pipe(Array.prepend(parts, kind), JSON.stringify)

export const adviceReportBlock = (advice: Advice): ReportBlock => {
  const pathLabel = advicePath(advice)
  const adviceIdentityParts = Array.make(advice.level, pathLabel, advice.title)
  const identity = reportIdentity("advice", adviceIdentityParts)

  const key = new AdviceReportKey({
    level: advice.level,
    path: pathLabel,
    title: advice.title
  })

  const text = adviceText(advice)
  const header = adviceHeader(advice)
  const cleared = `${header} — cleared`

  return new ReportBlock({ identity, key, text, cleared })
}

export const isFileLevelAdvice = (advice: Advice): boolean => advice.level === "file"

export const fileAdvicePath = (advice: Advice): string => advice.location.path
