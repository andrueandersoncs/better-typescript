import {
  Array,
  Chunk,
  Effect,
  HashSet,
  Option,
  Record,
  Order,
  Schema,
  Stream,
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

const detectionSignal = Schema.Any

// A rule's signal, tagged with the prose name its leaf prints.
export class RuleSignals extends Schema.Class<RuleSignals>("RuleSignals")({
  name: Schema.String,
  elements: detectionSignal
}) {
  declare readonly elements: Stream.Stream<Detection, Error>
}

export class NamedRuleCheck extends Schema.Class<NamedRuleCheck>(
  "NamedRuleCheck"
)({
  name: Schema.String,
  check: Schema.Any
}) {
  declare readonly check: RuleCheck
}

const namedRuleChecks = Schema.Array(NamedRuleCheck)
const optionalNamedRuleChecks = Schema.optional(namedRuleChecks)

export class ReportWiring extends Schema.Class<ReportWiring>("ReportWiring")({
  rules: namedRuleChecks,
  helpers: optionalNamedRuleChecks,
  advice: Schema.Any
}) {
  declare readonly advice: (
    rules: ReadonlyArray<RuleSignals>,
    helpers: ReadonlyArray<RuleSignals>
  ) => Stream.Stream<AdviceElement, Error>
}

class DedupeState extends Schema.Class<DedupeState>("DedupeState")({
  seen: Schema.Any,
  elements: Schema.Any
}) {
  declare readonly seen: HashSet.HashSet<string>
  declare readonly elements: ReadonlyArray<Detection>
}

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

// Dedupe repeated workspace locations, then rematerialize the rule's signal
// as a replayable snapshot stream every consumer can run independently.
const dedupedRuleSignals =
  (name: string) =>
  (collected: ReadonlyArray<Chunk.Chunk<Detection>>): RuleSignals => {
    const elements = collected.flatMap(Chunk.toReadonlyArray)
    const deduped = Array.reduce(elements, emptyDedupeState, addUniqueElement)
    const signal = Stream.fromIterable(deduped.elements)

    return new RuleSignals({ name, elements: signal })
  }

const ruleSignalsFromSnapshots =
  (snapshots: ReadonlyArray<Chunk.Chunk<AstNodeElement>>) =>
  (rule: NamedRuleCheck): Effect.Effect<RuleSignals, Error> =>
    pipe(
      Effect.forEach(snapshots, collectDetections(rule.check)),
      Effect.map(dedupedRuleSignals(rule.name))
    )

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
  (rule: NamedRuleCheck): Effect.Effect<RuleSignals, Error> =>
    pipe(
      snapshotWorkspace(workspace),
      Effect.flatMap((snapshots) => ruleSignalsFromSnapshots(snapshots)(rule))
    )

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

export const adviceText = (advice: AdviceElement): string => {
  const pathLabel = advicePath(advice)
  const header = `${pathLabel} [${advice.level}] — ${advice.title}`
  const remediation = `  fix: ${advice.remediation}`
  const evidence = advice.evidence.map(evidenceText)
  const lines = Array.appendAll([header, remediation], evidence)

  return Array.join(lines, "\n")
}

const detectionBlockKey = (element: Detection): string =>
  `${element.message}\u0000${element.hint}`

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

const sortedAdviceBlocks = (
  advice: ReadonlyArray<AdviceElement>
): ReadonlyArray<string> =>
  pipe(advice, Array.sort(adviceOrder), Array.map(adviceText))

// Leaf: fold the merged advice signal into ordered text blocks — file advice
// first, then directory, then project, each sorted by path.
export const adviceLeaf: (
  advice: Stream.Stream<AdviceElement, Error>
) => Stream.Stream<string, Error> = deriveSignals(sortedAdviceBlocks)

const ruleBlocksFor =
  (name: string) =>
  (elements: ReadonlyArray<Detection>): ReadonlyArray<string> =>
    pipe(
      Array.groupBy(elements, detectionBlockKey),
      Record.values,
      Array.map(ruleTextForDetections(name))
    )

// Leaf: fold one rule's signal into text blocks, one block per distinct
// message and hint, named by the prose string given at the wiring site.
export const ruleLeaf = (
  name: string
): ((
  elements: Stream.Stream<Detection, Error>
) => Stream.Stream<string, Error>) => deriveSignals(ruleBlocksFor(name))

const signalLeaf = (signals: RuleSignals): Stream.Stream<string, Error> =>
  ruleLeaf(signals.name)(signals.elements)

// The report is the concatenation of the leaf streams: the advice leaf first,
// then one rule leaf per reported rule in wiring order.
export const reportLeaves = (
  advice: Stream.Stream<AdviceElement, Error>,
  rules: ReadonlyArray<RuleSignals>
): Stream.Stream<string, Error> => {
  const adviceBlocks = adviceLeaf(advice)
  const ruleLeaves = Array.map(rules, signalLeaf)
  const leaves = Array.prepend(ruleLeaves, adviceBlocks)

  return pipe(Stream.fromIterable(leaves), Stream.flatten())
}

const pageBlocksSchema = Schema.Array(Schema.String)

export class Page extends Schema.Class<Page>("Page")({
  blocks: pageBlocksSchema,
  total: Schema.Number,
  startIndex: Schema.Number,
  endIndex: Schema.Number
}) {}

const pageEnd =
  (offsetValue: number) =>
  (limitValue: Option.Option<number>) =>
  (total: number): number =>
    pipe(
      limitValue,
      Option.match({
        onNone: () => total,
        onSome: (value) => Math.min(offsetValue + value, total)
      })
    )

export const paginateBlocks =
  (offsetValue: number) =>
  (limitValue: Option.Option<number>) =>
  (blocks: ReadonlyArray<string>): Page => {
    const total = blocks.length
    const endIndex = pageEnd(offsetValue)(limitValue)(total)
    const pageBlocks = blocks.slice(offsetValue, endIndex)
    const startIndex = pageBlocks.length === 0 ? 0 : offsetValue + 1

    return new Page({ blocks: pageBlocks, total, startIndex, endIndex })
  }

export const renderPage = (page: Page): string => {
  const body = page.blocks.join("\n\n")
  const hasMore = page.endIndex < page.total
  const footer = `Showing signals ${page.startIndex}-${page.endIndex} of ${page.total}. Use --offset ${page.endIndex} to see the next page.`

  return hasMore ? `${body}\n\n${footer}` : body
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

// Fallback suppression: a file-level fallback emission survives only where no
// file-level specific advice fired on the same path.
export const filterFallbackAdvice = (
  specificAdvice: Stream.Stream<AdviceElement, Error>,
  fallbackAdvice: Stream.Stream<AdviceElement, Error>
): Stream.Stream<AdviceElement, Error> =>
  pipe(
    collectSignals(specificAdvice),
    Effect.map(unfiredFallbackFilter(fallbackAdvice)),
    Stream.unwrap
  )

export const reportFromWiring =
  (wiring: ReportWiring) =>
  (workspace: LoadedWorkspace): Stream.Stream<string, Error> => {
    const checks = Array.appendAll(wiring.rules, wiring.helpers ?? [])
    const signalsEffect = pipe(
      snapshotWorkspace(workspace),
      Effect.flatMap((snapshots) =>
        Effect.forEach(checks, ruleSignalsFromSnapshots(snapshots))
      )
    )
    const leavesFromSignals = (
      signals: ReadonlyArray<RuleSignals>
    ): Stream.Stream<string, Error> => {
      const rules = Array.take(signals, wiring.rules.length)
      const helpers = Array.drop(signals, wiring.rules.length)
      const advice = wiring.advice(rules, helpers)

      return reportLeaves(advice, rules)
    }

    return pipe(
      Stream.fromEffect(signalsEffect),
      Stream.flatMap(leavesFromSignals)
    )
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

// The advice graph: each derivation consumes the upstream streams it needs.
// Snapshot streams replay on every run, so a stream consumed by two
// derivations recomputes its pure fold instead of sharing state.
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

const defaultWiring: ReportWiring = {
  rules: reportedRules,
  helpers: helperRules,
  advice: defaultAdvice
}

export const report = reportFromWiring(defaultWiring)
