import {
  Array,
  Chunk,
  Data,
  Effect,
  Equal,
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
import type { LoadedProject, LoadedWorkspace } from "../project/loadProject.js"
import { astNodes } from "./sources.js"
import type { AstNodeElement } from "./sources.js"
import type { Check, Detection } from "./check.js"
import { collectSignals } from "./derive.js"
import type { Advice, EvidenceItem } from "./derive.js"

export class NamedCheck extends Data.Class<{
  readonly name: string
  readonly check: Check
  readonly reported: boolean
}> {}

// One deduplicated, first-occurrence-ordered result from one check in one batch.
export class Signal extends Data.Class<{
  readonly name: string
  readonly reported: boolean
  readonly detections: ReadonlyArray<Detection>
}> {}

export class Wiring extends Data.Class<{
  readonly checks: ReadonlyArray<NamedCheck>
  readonly derive: (
    signals: ReadonlyArray<Signal>
  ) => Stream.Stream<Advice, Error>
}> {}

class DedupeState extends Data.Class<{
  readonly seen: HashMap.HashMap<string, ReadonlyArray<Detection>>
  readonly elements: ReadonlyArray<Detection>
}> {}

/**
 * Public stable identity for an advice report block.
 */
export class AdviceReportKey extends Schema.TaggedClass<AdviceReportKey>()(
  "advice",
  {
    level: Schema.String,
    path: Schema.String,
    title: Schema.String
  }
) {}

/**
 * Public stable identity for a local detection report block. The `_tag: "rule"`
 * wire key is retained for report compatibility while checks are the engine model.
 */
export class RuleReportKey extends Schema.TaggedClass<RuleReportKey>()("rule", {
  name: Schema.String,
  message: Schema.String,
  hint: Schema.String
}) {}

export type ReportKey = AdviceReportKey | RuleReportKey

export const reportKeySchema = Schema.Union(AdviceReportKey, RuleReportKey)

/**
 * A rendered report block with a stable identity across batches: identity is
 * private delta state, key is the public NDJSON identity, text is what the
 * report prints, cleared is the one line printed when the block disappears.
 */
export class ReportBlock extends Schema.Class<ReportBlock>("ReportBlock")({
  identity: Schema.String,
  key: reportKeySchema,
  text: Schema.String,
  cleared: Schema.String
}) {}

// Materialize a project's node stream once; every check replays the snapshot.
const snapshotProject = (
  project: LoadedProject
): Effect.Effect<Chunk.Chunk<AstNodeElement>, Error> => {
  const nodeStream = astNodes(project)

  return Stream.runCollect(nodeStream)
}

const emptyDedupeState: DedupeState = {
  seen: HashMap.empty<string, ReadonlyArray<Detection>>(),
  elements: []
}

const addUniqueElement = (
  state: DedupeState,
  element: Detection
): DedupeState => {
  const location = element.location
  const key = JSON.stringify([
    location.path,
    location.line,
    location.column,
    element.message,
    element.hint
  ])
  const bucket = pipe(
    HashMap.get(state.seen, key),
    Option.getOrElse((): ReadonlyArray<Detection> => [])
  )
  const hasMatchingData = (candidate: Detection): boolean =>
    Equal.equals(candidate.data, element.data)
  const alreadySeen = bucket.some(hasMatchingData)

  if (alreadySeen) {
    return state
  }

  const bucketWithElement = Array.append(bucket, element)
  const seen = HashMap.set(state.seen, key, bucketWithElement)
  const elements = Array.append(state.elements, element)

  return new DedupeState({ seen, elements })
}

// Run one check over one project's node snapshot and collect its signal.
const collectDetections =
  (check: Check) =>
  (
    nodes: Chunk.Chunk<AstNodeElement>
  ): Effect.Effect<Chunk.Chunk<Detection>, Error> => {
    const upstream = Stream.fromChunk(nodes)
    const signal = check(upstream)

    return Stream.runCollect(signal)
  }

// Dedupe repeated workspace detections into one materialized signal.
const dedupedSignal =
  (check: NamedCheck) =>
  (collected: ReadonlyArray<Chunk.Chunk<Detection>>): Signal => {
    const elements = collected.flatMap(Chunk.toReadonlyArray)
    const deduped = Array.reduce(elements, emptyDedupeState, addUniqueElement)

    return new Signal({
      name: check.name,
      reported: check.reported,
      detections: deduped.elements
    })
  }

const signalFromNodes =
  (snapshots: ReadonlyArray<Chunk.Chunk<AstNodeElement>>) =>
  (check: NamedCheck): Effect.Effect<Signal, Error> =>
    pipe(
      Effect.forEach(snapshots, collectDetections(check.check)),
      Effect.map(dedupedSignal(check))
    )

/**
 * Run every wired check over one consistent set of project node snapshots.
 * Effect.forEach preserves wiring order, producing a complete finite batch.
 */
export const workspaceSignals =
  (wiring: Wiring) =>
  (
    snapshots: ReadonlyArray<Chunk.Chunk<AstNodeElement>>
  ): Effect.Effect<ReadonlyArray<Signal>, Error> =>
    Effect.forEach(wiring.checks, signalFromNodes(snapshots))

/**
 * Within one batch, derivation consumes the complete materialized signal array.
 */
export const deriveAdvice =
  (wiring: Wiring) =>
  (
    signals: ReadonlyArray<Signal>
  ): Effect.Effect<ReadonlyArray<Advice>, Error> => {
    const advice = wiring.derive(signals)

    return collectSignals(advice)
  }

export const runCheckOnProject =
  (check: Check) =>
  (project: LoadedProject): Effect.Effect<ReadonlyArray<Detection>, Error> =>
    pipe(
      snapshotProject(project),
      Effect.flatMap(collectDetections(check)),
      Effect.map(Chunk.toReadonlyArray)
    )

const evidenceText = (item: EvidenceItem): string =>
  `  evidence: ${item.measure}: ${item.count}`

const adviceLevelRanks = { file: 0, directory: 1, project: 2 } as const

const adviceLevelRank = (advice: Advice): number =>
  adviceLevelRanks[advice.level]

const advicePath = (advice: Advice): string =>
  advice.level === "project" ? "project" : advice.location.path

const byAdviceLevel = Order.mapInput(Order.number, adviceLevelRank)
const byAdvicePath = Order.mapInput(Order.string, advicePath)
const adviceOrder = Order.combine(byAdviceLevel, byAdvicePath)

const adviceHeader = (advice: Advice): string => {
  const pathLabel = advicePath(advice)

  return `${pathLabel} [${advice.level}] — ${advice.title}`
}

export const adviceText = (advice: Advice): string => {
  const header = adviceHeader(advice)
  const remediation = `  fix: ${advice.remediation}`
  const evidence = advice.evidence.map(evidenceText)
  const lines = Array.appendAll([header, remediation], evidence)

  return Array.join(lines, "\n")
}

const reportIdentity = (kind: string, parts: ReadonlyArray<string>): string => {
  const identityParts = Array.prepend(parts, kind)

  return JSON.stringify(identityParts)
}

const adviceReportBlock = (advice: Advice): ReportBlock => {
  const pathLabel = advicePath(advice)
  const identity = reportIdentity("advice", [
    advice.level,
    pathLabel,
    advice.title
  ])
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

/**
 * Keyed advice blocks in report order: file advice first, then directory, then
 * project, each sorted by path.
 */
export const adviceReportBlocks = (
  advice: ReadonlyArray<Advice>
): ReadonlyArray<ReportBlock> =>
  pipe(advice, Array.sort(adviceOrder), Array.map(adviceReportBlock))

const detectionBlockKey = (element: Detection): string =>
  reportIdentity("detection", [element.message, element.hint])

const locationText = (element: Detection): string =>
  `  ${element.location.path}:${element.location.line}:${element.location.column}`

const checkTextForDetections =
  (name: string) =>
  (elements: ReadonlyArray<Detection>): string =>
    pipe(
      elements,
      Array.matchLeft({
        onEmpty: () => name,
        onNonEmpty: (first) => {
          const message = `  ${first.message}`
          const hint = `  Hint: ${first.hint}`
          const locations = Array.map(elements, locationText)
          const lines = Array.appendAll([name, message, hint], locations)

          return Array.join(lines, "\n")
        }
      })
    )

const checkReportBlockForGroup =
  (name: string) =>
  (elements: Array.NonEmptyArray<Detection>): ReportBlock => {
    const first = Array.headNonEmpty(elements)
    const identity = reportIdentity("rule", [name, first.message, first.hint])
    const key = new RuleReportKey({
      name,
      message: first.message,
      hint: first.hint
    })
    const text = checkTextForDetections(name)(elements)
    const cleared = `${name} — cleared: ${first.message}`

    return new ReportBlock({ identity, key, text, cleared })
  }

/**
 * Keyed local detection blocks, one per distinct message and hint, groups in
 * insertion order. The key kind remains `rule` for NDJSON compatibility.
 */
export const checkReportBlocks =
  (name: string) =>
  (elements: ReadonlyArray<Detection>): ReadonlyArray<ReportBlock> =>
    pipe(
      Array.groupBy(elements, detectionBlockKey),
      Record.values,
      Array.map(checkReportBlockForGroup(name))
    )

/**
 * One batch's full keyed report: advice blocks first, then reported local
 * blocks in wiring order. Silent signals still ran and fed derivation.
 */
export const reportBlocks =
  (signals: ReadonlyArray<Signal>) =>
  (advice: ReadonlyArray<Advice>): ReadonlyArray<ReportBlock> => {
    const adviceBlocks = adviceReportBlocks(advice)
    const signalBlocks = pipe(
      signals,
      Array.filter(Struct.get("reported")),
      Array.flatMap((signal) =>
        checkReportBlocks(signal.name)(signal.detections)
      )
    )

    return Array.appendAll(adviceBlocks, signalBlocks)
  }

/**
 * One batch through the derivation stage into its keyed blocks; shared by the
 * snapshot report and the watch pipeline.
 */
export const batchReportBlocks =
  (wiring: Wiring) =>
  (
    signals: ReadonlyArray<Signal>
  ): Effect.Effect<ReadonlyArray<ReportBlock>, Error> => {
    const advice = deriveAdvice(wiring)(signals)

    return Effect.map(advice, reportBlocks(signals))
  }

const isFileLevelAdvice = (advice: Advice): boolean => advice.level === "file"

const fileAdvicePath = (advice: Advice): string => advice.location.path

const isAdviceForUncoveredFile =
  (coveredFiles: HashSet.HashSet<string>) =>
  (advice: Advice): boolean => {
    const isNotFileLevel = advice.level !== "file"
    const isUncoveredFile = !HashSet.has(coveredFiles, advice.location.path)

    return isNotFileLevel || isUncoveredFile
  }

export const filterFallbackAdviceForUncoveredFiles =
  (specific: ReadonlyArray<Advice>) =>
  (
    fallbackAdvice: Stream.Stream<Advice, Error>
  ): Stream.Stream<Advice, Error> => {
    const fileAdvice = Array.filter(specific, isFileLevelAdvice)
    const paths = Array.map(fileAdvice, fileAdvicePath)
    const coveredFiles = HashSet.fromIterable(paths)

    return Stream.filter(fallbackAdvice, isAdviceForUncoveredFile(coveredFiles))
  }

/**
 * Fallback suppression: file-level fallback advice is emitted only for files
 * where no file-level specific advice fired. Specific advice is collected once
 * and emitted before the applicable fallback advice.
 */
export const withFallbackAdvice = (
  specificAdvice: Stream.Stream<Advice, Error>,
  fallbackAdvice: Stream.Stream<Advice, Error>
): Stream.Stream<Advice, Error> =>
  pipe(
    collectSignals(specificAdvice),
    Effect.map((specific) => {
      const fallback =
        filterFallbackAdviceForUncoveredFiles(specific)(fallbackAdvice)

      return pipe(Stream.fromIterable(specific), Stream.concat(fallback))
    }),
    Stream.unwrap
  )

/**
 * One workspace snapshot through the batch stages the watch pipeline reuses.
 * Engine surface for callers that need keyed blocks instead of rendered text.
 */
export const reportBlocksFromWiring =
  (wiring: Wiring) =>
  (
    workspace: LoadedWorkspace
  ): Effect.Effect<ReadonlyArray<ReportBlock>, Error> =>
    pipe(
      Effect.forEach(workspace.projects, snapshotProject),
      Effect.flatMap(workspaceSignals(wiring)),
      Effect.flatMap(batchReportBlocks(wiring))
    )

/**
 * The snapshot report: one workspace snapshot through the batch stages the
 * watch pipeline reuses. Library and test surface; the CLI watches instead.
 */
export const reportFromWiring =
  (wiring: Wiring) =>
  (workspace: LoadedWorkspace): Stream.Stream<string, Error> =>
    pipe(
      reportBlocksFromWiring(wiring)(workspace),
      Stream.fromIterableEffect,
      Stream.map(Struct.get("text"))
    )

export const signalOf =
  (signals: ReadonlyArray<Signal>) =>
  (name: string): Stream.Stream<Detection, Error> => {
    const namedSignal = Array.findFirst(
      signals,
      (signal) => signal.name === name
    )
    const detections = pipe(namedSignal, Option.map(Struct.get("detections")))

    return pipe(
      detections,
      Option.map(Stream.fromIterable),
      Option.getOrElse(() => Stream.empty)
    )
  }

export const namedCheck = (name: string, check: Check): NamedCheck =>
  new NamedCheck({ name, check, reported: true })

export const silentCheck = (name: string, check: Check): NamedCheck =>
  new NamedCheck({ name, check, reported: false })

const duplicateNameArray = Schema.Array(Schema.String)

export class DuplicateCheckNamesError extends Schema.TaggedError<DuplicateCheckNamesError>(
  "DuplicateCheckNamesError"
)("DuplicateCheckNamesError", {
  names: duplicateNameArray
}) {
  get message(): string {
    return `Duplicate check names: ${this.names.join(", ")}`
  }
}

class DuplicateNameState extends Data.Class<{
  readonly seen: HashSet.HashSet<string>
  readonly collisions: HashSet.HashSet<string>
  readonly names: ReadonlyArray<string>
}> {}

const emptyDuplicateNamesSeen = HashSet.empty<string>()
const emptyDuplicateNameCollisions = HashSet.empty<string>()

const emptyDuplicateNameState: DuplicateNameState = new DuplicateNameState({
  seen: emptyDuplicateNamesSeen,
  collisions: emptyDuplicateNameCollisions,
  names: []
})

const addDuplicateName = (
  state: DuplicateNameState,
  check: NamedCheck
): DuplicateNameState => {
  const name = check.name
  const alreadySeen = HashSet.has(state.seen, name)
  const alreadyCollision = HashSet.has(state.collisions, name)

  if (!alreadySeen) {
    const seen = HashSet.add(state.seen, name)

    return new DuplicateNameState({
      seen,
      collisions: state.collisions,
      names: state.names
    })
  }

  if (alreadyCollision) {
    return state
  }

  const collisions = HashSet.add(state.collisions, name)
  const names = Array.append(state.names, name)

  return new DuplicateNameState({
    seen: state.seen,
    collisions,
    names
  })
}

export const makeWiring = (wiring: Wiring): Wiring => {
  const names = Array.reduce(
    wiring.checks,
    emptyDuplicateNameState,
    addDuplicateName
  ).names

  if (names.length === 0) {
    return wiring
  }

  const duplicateNamesError = new DuplicateCheckNamesError({ names })
  const failedWiring = Effect.fail(duplicateNamesError)

  return Effect.runSync(failedWiring)
}
