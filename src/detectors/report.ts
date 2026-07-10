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
import type { RuleCheck, Detection } from "./rule.js"
import { collectSignals } from "./summary.js"
import type { AdviceElement, EvidenceItem } from "./summary.js"

// A rule's signal, tagged with the prose name its leaf prints.
export class RuleSignals extends Data.Class<{
  readonly name: string
  readonly elements: Stream.Stream<Detection, Error>
}> {}

export class NamedRuleCheck extends Data.Class<{
  readonly name: string
  readonly check: RuleCheck
}> {}

export class ReportWiring extends Data.Class<{
  readonly rules: ReadonlyArray<NamedRuleCheck>
  readonly helpers: ReadonlyArray<NamedRuleCheck>
  readonly advice: (
    rules: ReadonlyArray<RuleSignals>,
    helpers: ReadonlyArray<RuleSignals>
  ) => Stream.Stream<AdviceElement, Error>
}> {}

class DedupeState extends Data.Class<{
  readonly seen: HashMap.HashMap<string, ReadonlyArray<Detection>>
  readonly elements: ReadonlyArray<Detection>
}> {}

// One rule's materialized signal for one change batch: deduped, in order.
export class RuleSnapshot extends Data.Class<{
  readonly name: string
  readonly detections: ReadonlyArray<Detection>
}> {}

// Every rule's signal for ONE consistent batch; helpers feed advice only.
export class SignalsBatch extends Data.Class<{
  readonly rules: ReadonlyArray<RuleSnapshot>
  readonly helpers: ReadonlyArray<RuleSnapshot>
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
 * Public stable identity for a rule report block.
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

// Materialize a project's node stream once; every rule replays the snapshot.
const snapshotProject = (
  project: LoadedProject
): Effect.Effect<Chunk.Chunk<AstNodeElement>, Error> => {
  const nodeStream = astNodes(project)

  return Stream.runCollect(nodeStream)
}

const snapshotWorkspace = (
  workspace: LoadedWorkspace
): Effect.Effect<ReadonlyArray<Chunk.Chunk<AstNodeElement>>, Error> =>
  Effect.forEach(workspace.projects, snapshotProject)

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
  (check: RuleCheck) =>
  (
    nodes: Chunk.Chunk<AstNodeElement>
  ): Effect.Effect<Chunk.Chunk<Detection>, Error> => {
    const upstream = Stream.fromChunk(nodes)
    const signal = check(upstream)

    return Stream.runCollect(signal)
  }

// Dedupe repeated workspace detections into one rule's materialized snapshot.
const dedupedRuleSnapshot =
  (name: string) =>
  (collected: ReadonlyArray<Chunk.Chunk<Detection>>): RuleSnapshot => {
    const elements = collected.flatMap(Chunk.toReadonlyArray)
    const deduped = Array.reduce(elements, emptyDedupeState, addUniqueElement)

    return new RuleSnapshot({ name, detections: deduped.elements })
  }

const ruleSnapshotFromNodes =
  (snapshots: ReadonlyArray<Chunk.Chunk<AstNodeElement>>) =>
  (rule: NamedRuleCheck): Effect.Effect<RuleSnapshot, Error> =>
    pipe(
      Effect.forEach(snapshots, collectDetections(rule.check)),
      Effect.map(dedupedRuleSnapshot(rule.name))
    )

const splitSignalsBatch =
  (ruleCount: number) =>
  (snapshots: ReadonlyArray<RuleSnapshot>): SignalsBatch => {
    const rules = Array.take(snapshots, ruleCount)
    const helpers = Array.drop(snapshots, ruleCount)

    return new SignalsBatch({ rules, helpers })
  }

/**
 * Run every wired check (rules first, then helpers) over one consistent set of
 * project node snapshots and split the results back along the wiring.
 */
export const workspaceSignals =
  (wiring: ReportWiring) =>
  (
    snapshots: ReadonlyArray<Chunk.Chunk<AstNodeElement>>
  ): Effect.Effect<SignalsBatch, Error> => {
    const checks = Array.appendAll(wiring.rules, wiring.helpers)
    const collected = Effect.forEach(checks, ruleSnapshotFromNodes(snapshots))

    return Effect.map(collected, splitSignalsBatch(wiring.rules.length))
  }

// Lift a materialized snapshot back into the replayable stream form the advice wiring consumes.
const snapshotSignals = (snapshot: RuleSnapshot): RuleSignals => {
  const elements = Stream.fromIterable(snapshot.detections)

  return new RuleSignals({ name: snapshot.name, elements })
}

/**
 * Within one batch the ADR-0006 advice graph runs unchanged: advice consumes
 * the replayable rule streams it needs.
 */
export const collectAdvice =
  (wiring: ReportWiring) =>
  (batch: SignalsBatch): Effect.Effect<ReadonlyArray<AdviceElement>, Error> => {
    const rules = Array.map(batch.rules, snapshotSignals)
    const helpers = Array.map(batch.helpers, snapshotSignals)
    const advice = wiring.advice(rules, helpers)

    return collectSignals(advice)
  }

export const runRuleCheckOnProject =
  (check: RuleCheck) =>
  (project: LoadedProject): Effect.Effect<ReadonlyArray<Detection>, Error> =>
    pipe(
      snapshotProject(project),
      Effect.flatMap(collectDetections(check)),
      Effect.map(Chunk.toReadonlyArray)
    )

export const runRuleSignals =
  (workspace: LoadedWorkspace) =>
  (rule: NamedRuleCheck): Effect.Effect<RuleSignals, Error> => {
    const snapshotted = pipe(
      snapshotWorkspace(workspace),
      Effect.flatMap((snapshots) => ruleSnapshotFromNodes(snapshots)(rule))
    )

    return Effect.map(snapshotted, snapshotSignals)
  }

const evidenceText = (item: EvidenceItem): string =>
  `  evidence: ${item.measure}: ${item.count}`

const adviceLevelRanks = { file: 0, directory: 1, project: 2 } as const

const adviceLevelRank = (advice: AdviceElement): number =>
  adviceLevelRanks[advice.level]

const advicePath = (advice: AdviceElement): string =>
  advice.level === "project" ? "project" : advice.location.path

const byAdviceLevel = Order.mapInput(Order.number, adviceLevelRank)
const byAdvicePath = Order.mapInput(Order.string, advicePath)
const adviceOrder = Order.combine(byAdviceLevel, byAdvicePath)

const adviceHeader = (advice: AdviceElement): string => {
  const pathLabel = advicePath(advice)

  return `${pathLabel} [${advice.level}] — ${advice.title}`
}

export const adviceText = (advice: AdviceElement): string => {
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

const adviceReportBlock = (advice: AdviceElement): ReportBlock => {
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
  advice: ReadonlyArray<AdviceElement>
): ReadonlyArray<ReportBlock> =>
  pipe(advice, Array.sort(adviceOrder), Array.map(adviceReportBlock))

const detectionBlockKey = (element: Detection): string =>
  reportIdentity("detection", [element.message, element.hint])

const locationText = (element: Detection): string =>
  `  ${element.location.path}:${element.location.line}:${element.location.column}`

const ruleTextForDetections =
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

const ruleReportBlockForGroup =
  (name: string) =>
  (elements: Array.NonEmptyArray<Detection>): ReportBlock => {
    const first = Array.headNonEmpty(elements)
    const identity = reportIdentity("rule", [name, first.message, first.hint])
    const key = new RuleReportKey({
      name,
      message: first.message,
      hint: first.hint
    })
    const text = ruleTextForDetections(name)(elements)
    const cleared = `${name} — cleared: ${first.message}`

    return new ReportBlock({ identity, key, text, cleared })
  }

/**
 * Keyed rule blocks, one per distinct message and hint, groups in insertion
 * order.
 */
export const ruleReportBlocks =
  (name: string) =>
  (elements: ReadonlyArray<Detection>): ReadonlyArray<ReportBlock> =>
    pipe(
      Array.groupBy(elements, detectionBlockKey),
      Record.values,
      Array.map(ruleReportBlockForGroup(name))
    )

const blockText: (block: ReportBlock) => string = Struct.get("text")


const ruleSnapshotBlocks = (
  snapshot: RuleSnapshot
): ReadonlyArray<ReportBlock> =>
  ruleReportBlocks(snapshot.name)(snapshot.detections)

/**
 * One batch's full keyed report: advice blocks first, then rule blocks in
 * wiring order.
 */
export const reportBlocks =
  (batch: SignalsBatch) =>
  (advice: ReadonlyArray<AdviceElement>): ReadonlyArray<ReportBlock> => {
    const adviceBlocks = adviceReportBlocks(advice)
    const ruleBlocks = batch.rules.flatMap(ruleSnapshotBlocks)

    return Array.appendAll(adviceBlocks, ruleBlocks)
  }

/**
 * One batch through the advice stage into its keyed blocks; shared by the
 * snapshot report and the watch pipeline.
 */
export const batchReportBlocks =
  (wiring: ReportWiring) =>
  (batch: SignalsBatch): Effect.Effect<ReadonlyArray<ReportBlock>, Error> => {
    const advice = collectAdvice(wiring)(batch)

    return Effect.map(advice, reportBlocks(batch))
  }

const isFileLevelAdvice = (advice: AdviceElement): boolean =>
  advice.level === "file"

const fileAdvicePath = (advice: AdviceElement): string => advice.location.path

const isUnfiredFallback =
  (firedFiles: HashSet.HashSet<string>) =>
  (advice: AdviceElement): boolean => {
    const isNotFileLevel = advice.level !== "file"
    const isUnfiredFile = !HashSet.has(firedFiles, advice.location.path)

    return isNotFileLevel || isUnfiredFile
  }

const unfiredFallbackFilter =
  (fallbackAdvice: Stream.Stream<AdviceElement, Error>) =>
  (
    specific: ReadonlyArray<AdviceElement>
  ): Stream.Stream<AdviceElement, Error> => {
    const fileAdvice = Array.filter(specific, isFileLevelAdvice)
    const paths = Array.map(fileAdvice, fileAdvicePath)
    const firedFiles = HashSet.fromIterable(paths)

    return Stream.filter(fallbackAdvice, isUnfiredFallback(firedFiles))
  }

/**
 * Fallback suppression: file-level fallback advice is emitted only for files
 * where no file-level specific advice fired. Specific advice is collected once
 * and emitted before the applicable fallback advice.
 */
export const withFallbackAdvice = (
  specificAdvice: Stream.Stream<AdviceElement, Error>,
  fallbackAdvice: Stream.Stream<AdviceElement, Error>
): Stream.Stream<AdviceElement, Error> =>
  pipe(
    collectSignals(specificAdvice),
    Effect.map((specific) => {
      const fallback = unfiredFallbackFilter(fallbackAdvice)(specific)

      return pipe(Stream.fromIterable(specific), Stream.concat(fallback))
    }),
    Stream.unwrap
  )

/**
 * One workspace snapshot through the batch stages the watch pipeline reuses.
 * Engine surface for callers that need keyed blocks instead of rendered text.
 */
export const reportBlocksFromWiring =
  (wiring: ReportWiring) =>
  (
    workspace: LoadedWorkspace
  ): Effect.Effect<ReadonlyArray<ReportBlock>, Error> =>
    pipe(
      snapshotWorkspace(workspace),
      Effect.flatMap(workspaceSignals(wiring)),
      Effect.flatMap(batchReportBlocks(wiring))
    )

/**
 * The snapshot report: one workspace snapshot through the batch stages the
 * watch pipeline reuses. Library and test surface; the CLI watches instead.
 */
export const reportFromWiring =
  (wiring: ReportWiring) =>
  (workspace: LoadedWorkspace): Stream.Stream<string, Error> =>
    pipe(
      reportBlocksFromWiring(wiring)(workspace),
      Stream.fromIterableEffect,
      Stream.map(blockText)
    )

const hasSignalName =
  (name: string) =>
  (signal: RuleSignals): boolean =>
    signal.name === name

export const ruleSignal =
  (signals: ReadonlyArray<RuleSignals>) =>
  (name: string): Stream.Stream<Detection, Error> =>
    signals.find(hasSignalName(name))?.elements ?? Stream.empty

export const namedRuleCheck = (name: string, check: RuleCheck): NamedRuleCheck =>
  new NamedRuleCheck({ name, check })

const duplicateNameArray = Schema.Array(Schema.String)

class DuplicateWiringNamesError extends Schema.TaggedError<DuplicateWiringNamesError>(
  "DuplicateWiringNamesError"
)("DuplicateWiringNamesError", {
  rules: duplicateNameArray,
  helpers: duplicateNameArray
}) {
  get message(): string {
    const ruleSection =
      this.rules.length === 0 ? "" : `rules: ${this.rules.join(", ")}`
    const helperSection =
      this.helpers.length === 0 ? "" : `helpers: ${this.helpers.join(", ")}`
    const ruleSections: ReadonlyArray<string> =
      ruleSection.length === 0 ? [] : [ruleSection]
    const sections =
      helperSection.length === 0
        ? ruleSections
        : Array.append(ruleSections, helperSection)

    return `Duplicate report wiring names (${sections.join("; ")})`
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
  check: NamedRuleCheck
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

const duplicateNames = (
  checks: ReadonlyArray<NamedRuleCheck>
): ReadonlyArray<string> =>
  Array.reduce(checks, emptyDuplicateNameState, addDuplicateName).names

export const makeWiring = (wiring: ReportWiring): ReportWiring => {
  const rules = duplicateNames(wiring.rules)
  const helpers = duplicateNames(wiring.helpers)
  const hasRuleDuplicates = rules.length > 0
  const hasHelperDuplicates = helpers.length > 0
  const hasDuplicateNames = hasRuleDuplicates || hasHelperDuplicates

  if (!hasDuplicateNames) {
    return wiring
  }

  const duplicateNamesError = new DuplicateWiringNamesError({
    rules,
    helpers
  })
  const failedWiring = Effect.fail(duplicateNamesError)

  return Effect.runSync(failedWiring)
}
