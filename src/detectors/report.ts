import {
  Array,
  Chunk,
  Data,
  Effect,
  HashSet,
  Record,
  Order,
  Schema,
  Stream,
  Struct,
  pipe
} from "effect"
import type { LoadedProject, LoadedWorkspace } from "../project/loadProject.js"
import { astNodes } from "./sources.js"
import type { AstNodeElement } from "./sources.js"
import type { RuleCheck, Detection } from "./rule.js"
import {
  NamedDetection,
  collectSignals,
  deriveSignals,
  namedDetection
} from "./summary.js"
import type { AdviceElement, EvidenceItem } from "./summary.js"
import { preferCurriedDataLastFunctions } from "../advice/preferCurriedDataLastFunctions.js"
import {
  noAbstractClasses,
  noArraySpread,
  noAsyncFunctions,
  noCallbacks,
  noClassMethodImplementations,
  noDataTaggedClass,
  noDuplicateFunctionNames,
  noDuplicateIfBodies,
  noExplicitAnyReturn,
  noFirstPartySchemaDeclare,
  noForInLoops,
  noForLoops,
  noForOfLoops,
  noFunctionKeyword,
  noInlineBooleanExpressions,
  noInlineClosures,
  noInstanceof,
  noManualTypeDispatch,
  noMultiLineComments,
  noMultipleBooleanOperators,
  noMutableArrayMethods,
  noMutableVariableDeclarations,
  noMutation,
  noNestedCalls,
  noNestedIfStatements,
  noNewError,
  noNonNullAssertion,
  noRawObjectTypes,
  noRootLevelClasses,
  noSingleUseCallee,
  noSwitchStatements,
  noThrow,
  noTryCatch,
  noUndefined,
  noVoidFunctions,
  preferConditionalReturn,
  preferDataLastModule,
  preferDirectBooleanReturn,
  preferEffectArrayAppendAll,
  preferEffectFn,
  preferEffectPropertyAccessors,
  preferEffectRecordFilterMap,
  preferEffectSchemaClass,
  preferEffectSchemaConstructor,
  preferEffectSchemaGuard,
  preferEffectSchemaIs,
  preferHashMap,
  preferHashSet,
  preferImplicitReturn,
  preferOptionMatch,
  preferPipeFunction
} from "../rules/index.js"
import {
  highSignalDensity,
  hotSubsystem,
  imperativeStateManager,
  pipelineHostile,
  ruleDominance,
  sideEffectLaundering,
  systemicHotspots
} from "../advice/index.js"

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
  readonly seen: HashSet.HashSet<string>
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
  seen: HashSet.empty<string>(),
  elements: []
}

const addUniqueElement = (
  state: DedupeState,
  element: Detection
): DedupeState => {
  const location = element.location
  const key = `${location.path}:${location.line}:${location.column}`
  const alreadySeen = HashSet.has(state.seen, key)

  if (alreadySeen) {
    return state
  }

  const seen = HashSet.add(state.seen, key)
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

// Dedupe repeated workspace locations into one rule's materialized snapshot.
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

const sortedAdviceBlockTexts = (
  advice: ReadonlyArray<AdviceElement>
): ReadonlyArray<string> =>
  pipe(advice, adviceReportBlocks, Array.map(blockText))

/**
 * Leaf: fold the merged advice signal into ordered text blocks — file advice
 * first, then directory, then project, each sorted by path.
 */
export const adviceLeaf: (
  advice: Stream.Stream<AdviceElement, Error>
) => Stream.Stream<string, Error> = deriveSignals(sortedAdviceBlockTexts)

const ruleBlockTexts =
  (name: string) =>
  (elements: ReadonlyArray<Detection>): ReadonlyArray<string> =>
    pipe(elements, ruleReportBlocks(name), Array.map(blockText))

/**
 * Leaf: fold one rule's signal into text blocks, one block per distinct
 * message and hint, named by the prose string given at the wiring site.
 */
export const ruleLeaf = (
  name: string
): ((
  elements: Stream.Stream<Detection, Error>
) => Stream.Stream<string, Error>) => deriveSignals(ruleBlockTexts(name))

const signalLeaf = (signals: RuleSignals): Stream.Stream<string, Error> =>
  ruleLeaf(signals.name)(signals.elements)

/**
 * The report is the concatenation of the leaf streams: the advice leaf first,
 * then one rule leaf per reported rule in wiring order.
 */
export const reportLeaves = (
  advice: Stream.Stream<AdviceElement, Error>,
  rules: ReadonlyArray<RuleSignals>
): Stream.Stream<string, Error> => {
  const adviceBlocks = adviceLeaf(advice)
  const ruleLeaves = Array.map(rules, signalLeaf)
  const leaves = Array.prepend(ruleLeaves, adviceBlocks)

  return pipe(Stream.fromIterable(leaves), Stream.flatten())
}

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
 * Fallback suppression: a file-level fallback emission survives only where no
 * file-level specific advice fired on the same path.
 */
export const filterFallbackAdvice = (
  specificAdvice: Stream.Stream<AdviceElement, Error>,
  fallbackAdvice: Stream.Stream<AdviceElement, Error>
): Stream.Stream<AdviceElement, Error> =>
  pipe(
    collectSignals(specificAdvice),
    Effect.map(unfiredFallbackFilter(fallbackAdvice)),
    Stream.unwrap
  )

/**
 * The snapshot report: one workspace snapshot through the batch stages the
 * watch pipeline reuses. Library and test surface; the CLI watches instead.
 */
export const reportFromWiring =
  (wiring: ReportWiring) =>
  (workspace: LoadedWorkspace): Stream.Stream<string, Error> => {
    const blocksEffect = pipe(
      snapshotWorkspace(workspace),
      Effect.flatMap(workspaceSignals(wiring)),
      Effect.flatMap(batchReportBlocks(wiring))
    )

    return pipe(Stream.fromIterableEffect(blocksEffect), Stream.map(blockText))
  }

const hasSignalName =
  (name: string) =>
  (signal: RuleSignals): boolean =>
    signal.name === name

const ruleSignalElements =
  (signals: ReadonlyArray<RuleSignals>) =>
  (name: string): Stream.Stream<Detection, Error> =>
    signals.find(hasSignalName(name))?.elements ?? Stream.empty

const nameDetections = (
  rule: RuleSignals
): Stream.Stream<NamedDetection, Error> =>
  Stream.map(rule.elements, namedDetection(rule.name))

const namedRuleCheck = (name: string, check: RuleCheck): NamedRuleCheck =>
  new NamedRuleCheck({ name, check })

const reportedRules: ReadonlyArray<NamedRuleCheck> = [
  namedRuleCheck("prefer-effect-schema-guard", preferEffectSchemaGuard),
  namedRuleCheck("prefer-effect-schema-is", preferEffectSchemaIs),
  namedRuleCheck(
    "prefer-effect-schema-constructor",
    preferEffectSchemaConstructor
  ),
  namedRuleCheck("prefer-effect-schema-class", preferEffectSchemaClass),
  namedRuleCheck("prefer-effect-fn", preferEffectFn),
  namedRuleCheck(
    "prefer-effect-property-accessors",
    preferEffectPropertyAccessors
  ),
  namedRuleCheck(
    "prefer-effect-record-filter-map",
    preferEffectRecordFilterMap
  ),
  namedRuleCheck("prefer-effect-array-append-all", preferEffectArrayAppendAll),
  namedRuleCheck("prefer-data-last-module", preferDataLastModule),
  namedRuleCheck("prefer-conditional-return", preferConditionalReturn),
  namedRuleCheck("prefer-direct-boolean-return", preferDirectBooleanReturn),
  namedRuleCheck("prefer-implicit-return", preferImplicitReturn),
  namedRuleCheck("no-throw", noThrow),
  namedRuleCheck("no-new-error", noNewError),
  namedRuleCheck("no-try-catch", noTryCatch),
  namedRuleCheck("no-undefined", noUndefined),
  namedRuleCheck("no-void-functions", noVoidFunctions),
  namedRuleCheck("no-root-level-classes", noRootLevelClasses),
  namedRuleCheck("no-multi-line-comments", noMultiLineComments),
  namedRuleCheck("no-explicit-any-return", noExplicitAnyReturn),
  namedRuleCheck("no-multiple-boolean-operators", noMultipleBooleanOperators),
  namedRuleCheck("no-inline-boolean-expressions", noInlineBooleanExpressions),
  namedRuleCheck("no-mutable-array-methods", noMutableArrayMethods),
  namedRuleCheck(
    "no-mutable-variable-declarations",
    noMutableVariableDeclarations
  ),
  namedRuleCheck("no-mutation", noMutation),
  namedRuleCheck("no-nested-if-statements", noNestedIfStatements),
  namedRuleCheck("no-non-null-assertion", noNonNullAssertion),
  namedRuleCheck("no-duplicate-if-bodies", noDuplicateIfBodies),
  namedRuleCheck("no-duplicate-function-names", noDuplicateFunctionNames),
  namedRuleCheck("no-callbacks", noCallbacks),
  namedRuleCheck("no-async-functions", noAsyncFunctions),
  namedRuleCheck("no-array-spread", noArraySpread),
  namedRuleCheck("no-for-in-loops", noForInLoops),
  namedRuleCheck("no-for-loops", noForLoops),
  namedRuleCheck("no-for-of-loops", noForOfLoops),
  namedRuleCheck("no-switch-statements", noSwitchStatements),
  namedRuleCheck("no-function-keyword", noFunctionKeyword),
  namedRuleCheck("no-inline-closures", noInlineClosures),
  namedRuleCheck("no-nested-calls", noNestedCalls),
  namedRuleCheck("no-manual-type-dispatch", noManualTypeDispatch),
  namedRuleCheck("no-abstract-classes", noAbstractClasses),
  namedRuleCheck(
    "no-class-method-implementations",
    noClassMethodImplementations
  ),
  namedRuleCheck("no-raw-object-types", noRawObjectTypes),
  namedRuleCheck("no-first-party-schema-declare", noFirstPartySchemaDeclare),
  namedRuleCheck("no-data-tagged-class", noDataTaggedClass),
  namedRuleCheck("no-instanceof", noInstanceof),
  namedRuleCheck("no-single-use-callee", noSingleUseCallee),
  namedRuleCheck("prefer-hash-set", preferHashSet),
  namedRuleCheck("prefer-hash-map", preferHashMap),
  namedRuleCheck("prefer-option-match", preferOptionMatch),
  namedRuleCheck("prefer-pipe-function", preferPipeFunction)
]

const helperRules: ReadonlyArray<NamedRuleCheck> = [
  new NamedRuleCheck({
    name: "prefer-curried-data-last-functions",
    check: preferCurriedDataLastFunctions
  })
]

// The advice graph: each derivation consumes the streams it needs. Snapshot streams replay on every run, so a stream consumed by two derivations recomputes its pure fold instead of sharing state.
const defaultAdvice = (
  ruleSignals: ReadonlyArray<RuleSignals>,
  helperSignals: ReadonlyArray<RuleSignals>
): Stream.Stream<AdviceElement, Error> => {
  const elementsOf = ruleSignalElements(ruleSignals)
  const helperElementsOf = ruleSignalElements(helperSignals)
  const namedElements = pipe(
    Stream.fromIterable(ruleSignals),
    Stream.flatMap(nameDetections)
  )
  const noMutation = elementsOf("no-mutation")
  const preferHashMap = elementsOf("prefer-hash-map")
  const preferHashSet = elementsOf("prefer-hash-set")
  const noMutableArrayMethods = elementsOf("no-mutable-array-methods")
  const noMutableVariableDeclarations = elementsOf(
    "no-mutable-variable-declarations"
  )
  const noNestedCalls = elementsOf("no-nested-calls")
  const preferCurried = helperElementsOf("prefer-curried-data-last-functions")
  const imperativeAdvice = imperativeStateManager({
    noMutation,
    preferHashMap,
    preferHashSet,
    noMutableArrayMethods,
    noMutableVariableDeclarations
  })
  const launderingAdvice = sideEffectLaundering(namedElements)
  const pipelineAdvice = pipelineHostile({
    noNestedCalls,
    preferCurriedDataLastFunctions: preferCurried
  })
  const specificAdvice = pipe(
    Stream.fromIterable([imperativeAdvice, launderingAdvice, pipelineAdvice]),
    Stream.flatten()
  )
  const densityAdvice = highSignalDensity(namedElements)
  const filteredDensityAdvice = filterFallbackAdvice(
    specificAdvice,
    densityAdvice
  )
  const subsystemAdvice = hotSubsystem(namedElements)
  const dominanceAdvice = ruleDominance(namedElements)
  const systemicAdvice = systemicHotspots({
    hotSubsystem: subsystemAdvice,
    highSignalDensity: filteredDensityAdvice
  })

  return pipe(
    Stream.fromIterable([
      specificAdvice,
      filteredDensityAdvice,
      subsystemAdvice,
      dominanceAdvice,
      systemicAdvice
    ]),
    Stream.flatten()
  )
}

export const defaultWiring: ReportWiring = {
  rules: reportedRules,
  helpers: helperRules,
  advice: defaultAdvice
}

export const report = reportFromWiring(defaultWiring)
