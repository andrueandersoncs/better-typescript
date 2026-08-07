import * as fs from "node:fs"
import * as path from "node:path"
import type * as ts from "typescript"
import {
  Array,
  Effect,
  Function,
  HashMap,
  Match,
  MutableList,
  Option,
  Order,
  Record,
  Result,
  Struct,
  SynchronizedRef,
  Tuple,
  flow,
  pipe
} from "effect"
import { WorkspaceContext } from "@better-typescript/matchers/matcher/workspaceContext"
import { WorkspaceSourceFile } from "@better-typescript/matchers/matcher/workspaceSourceFile"
import { ProgramContext } from "@better-typescript/matchers/sources/data"
import { isProjectSourceFile } from "@better-typescript/matchers/sources/isProjectSourceFile"
import { Advice } from "./derive/advice.js"
import type { EvidenceItem } from "./derive/evidenceItem.js"
import { advicePath } from "./derive/advicePath.js"
import { formatRefactorExample } from "./example/formatRefactorExample.js"
import { collectDirectoryEntries } from "./example/collectDirectoryEntries.js"
import type { ResolveRefactorExamples } from "./example/resolveRefactorExamples.js"
import type { DirectoryRefactorExamples } from "./example/directoryRefactorExamples.js"
import { ExampleLoadError } from "./example/exampleLoadError.js"
import { ExampleSnippet } from "./example/exampleSnippet.js"
import { InlineRefactorExamples } from "./example/inlineRefactorExamples.js"
import type { RefactorExampleSource } from "./example/refactorExampleSource.js"
import { RefactorExample } from "./example/refactorExample.js"
import type { Detection } from "./location/detectionData.js"
import type { Policy } from "./policy/policyClass.js"
import type { WorkspacePolicy } from "./policy/workspacePolicyClass.js"
import { toPolicies } from "./policy/locateTarget.js"
import { detectionsForLocatedPolicies } from "./policy/locatedPolicyDetections.js"
import { runWorkspaceMatchers } from "@better-typescript/matchers/matcher/runWorkspaceMatchers"
import { AdviceReportKey } from "./report/adviceReportKey.js"
import { appendDetection } from "./report/appendDetection.js"
import { EmptyReportEvent } from "./report/emptyReportEvent.js"
import { noDetections } from "./report/emptyDetectionsBucket.js"
import type { MutableElementBuckets } from "./report/mutableElementBuckets.js"
import type { MutableSeenBuckets } from "./report/mutableSeenBuckets.js"
import type { MutableWorkspaceFiles } from "./report/mutableWorkspaceFiles.js"
import { relativeWorkspacePath } from "./report/relativeWorkspacePath.js"
import { ReportBlock } from "./report/reportBlock.js"
import type { ReportEvent } from "./report/reportEvent.js"
import { RuleReportKey } from "./report/ruleReportKey.js"
import { SignalEvent } from "./report/signalEvent.js"
import { SourceMatch } from "./report/sourceMatch.js"
import { storageForSlot } from "./report/storageForSlot.js"
import { Signal } from "./signal/data.js"
import { WiringSignals } from "./signal/wiringSignals.js"
import type { WiringConfig } from "./wiring/wiringConfig.js"
import type { WiringEntry } from "./wiring/wiringEntry.js"
import { ProgramPolicySlot } from "./wiring/programPolicySlot.js"
import { isProgramPolicy } from "./wiring/isProgramPolicy.js"
import { isWorkspacePolicy } from "./wiring/workspacePolicyInstance.js"
import type { WiringPolicy } from "./wiring/wiringPolicy.js"
import { matchesFile } from "./wiring/matchesFile.js"
import type { GlobMatcher } from "./wiring/globMatcher.js"
import { compileGlobMatcher } from "./wiring/compileGlobMatcher.js"
import { strictEqual } from "./equivalence/strictEqual.js"
import { WorkspaceUpdate } from "./watch/data.js"

// --- advice text/order because consumers need one stable render surface ---

export const evidenceText = (item: EvidenceItem) => `  evidence: ${item.measure}: ${item.count}`

const adviceLevelRanks = { file: 0, directory: 1, project: 2 } as const
const zeroAdviceLevelRank = Function.constant(0)

export const adviceLevelRank = (advice: Advice) =>
  pipe(Record.get(adviceLevelRanks, advice.level), Option.getOrElse(zeroAdviceLevelRank))

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

// --- location helpers because detection groups share location identity ---

export const detectionBlockKey = (element: Detection) => {
  const detectionIdentityParts = Array.make(element.message, element.hint)

  return pipe(Array.prepend(detectionIdentityParts, "detection"), JSON.stringify)
}

export const locationText = (element: Detection) =>
  `  ${element.location.path}:${element.location.line}:${element.location.column}`

// --- example loading because advice and signals share one resolver ---

const directoryExists = (absolutePath: string) => {
  const exists = fs.existsSync(absolutePath)

  return exists && fs.statSync(absolutePath).isDirectory()
}

const collectTypeScriptFiles: (
  directory: string
) => Effect.Effect<ReadonlyArray<string>, ExampleLoadError> = Effect.fn(
  "Example.collectTypeScriptFiles"
)(function* (directory: string) {
  const entries = yield* collectDirectoryEntries(directory)

  const nested = yield* Effect.forEach(entries, (entry) => {
    const absolute = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      return collectTypeScriptFiles(absolute)
    }

    const typescript = entry.name.endsWith(".ts")
    const declaration = entry.name.endsWith(".d.ts")
    const notDeclaration = !declaration
    const isSource = typescript && notDeclaration
    const keep = entry.isFile() && isSource
    const paths = keep ? Array.of(absolute) : Array.empty()

    return Effect.succeed(paths)
  })

  const flattened = Array.flatten(nested)

  return Array.sort(flattened, Order.String)
})

const readExampleTree: (
  treeRoot: string
) => Effect.Effect<Array.NonEmptyReadonlyArray<ExampleSnippet>, ExampleLoadError> = Effect.fn(
  "Example.readExampleTree"
)(function* (treeRoot: string) {
  const absoluteFiles = yield* collectTypeScriptFiles(treeRoot)

  const readSnippet = Effect.fn("Example.readSnippet")(function* (absoluteFile: string) {
    const code = yield* Effect.try({
      try: () => {
        const text = fs.readFileSync(absoluteFile, "utf8")

        return text.endsWith("\n") ? text.slice(0, -1) : text
      },
      catch: () =>
        new ExampleLoadError({
          message: `Unable to read example file: ${absoluteFile}`
        })
    })

    const relative = path.relative(treeRoot, absoluteFile)
    const segments = relative.split(path.sep)
    const filePath = Array.join(segments, "/")

    return ExampleSnippet.make({ filePath, code })
  })

  const snippets = yield* Effect.forEach(absoluteFiles, readSnippet)

  return yield* pipe(
    snippets,
    Array.matchLeft({
      onEmpty: () =>
        pipe(
          new ExampleLoadError({
            message: `Example tree has no TypeScript files: ${treeRoot}`
          }),
          Effect.fail
        ),
      onNonEmpty: (first, rest) => pipe(Array.prepend(rest, first), Effect.succeed)
    })
  )
})

const loadRefactorExamplesAt: (
  exampleRoot: string
) => Effect.Effect<Array.NonEmptyReadonlyArray<RefactorExample>, ExampleLoadError> = Effect.fn(
  "Example.loadRefactorExamplesAt"
)(function* (exampleRoot: string) {
  if (!directoryExists(exampleRoot)) {
    return yield* new ExampleLoadError({
      message: `Missing example directory: ${exampleRoot}`
    })
  }

  const entries = yield* collectDirectoryEntries(exampleRoot)

  const names = Array.flatMap(entries, (entry) => {
    if (!entry.isDirectory()) {
      return Array.empty()
    }

    const pairRoot = path.join(exampleRoot, entry.name)
    const badRoot = path.join(pairRoot, "bad")
    const goodRoot = path.join(pairRoot, "good")
    const hasBad = directoryExists(badRoot)
    const hasGood = directoryExists(goodRoot)
    const complete = hasBad && hasGood

    return complete ? Array.of(entry.name) : Array.empty()
  })

  const pairNames = Array.sort(names, Order.String)

  const loadPairExample = Effect.fn("Example.loadPairExample")(function* (pairName: string) {
    const pairRoot = path.join(exampleRoot, pairName)
    const badRoot = path.join(pairRoot, "bad")
    const goodRoot = path.join(pairRoot, "good")
    const bad = yield* readExampleTree(badRoot)
    const good = yield* readExampleTree(goodRoot)

    return RefactorExample.make({ bad, good })
  })

  const examples = yield* Effect.forEach(pairNames, loadPairExample)

  return yield* pipe(
    examples,
    Array.matchLeft({
      onEmpty: () =>
        pipe(
          new ExampleLoadError({
            message: `Expected example/<id>/{bad,good} directories under ${exampleRoot}`
          }),
          Effect.fail
        ),
      onNonEmpty: (first, rest) => pipe(Array.prepend(rest, first), Effect.succeed)
    })
  )
})

// One resolver caches successful directory loads because a watch run shares one report program.
export const makeRefactorExampleResolver = Effect.fn("Example.makeRefactorExampleResolver")(
  function* () {
    const emptyCache = HashMap.empty<string, Array.NonEmptyReadonlyArray<RefactorExample>>()
    const cache = yield* SynchronizedRef.make(emptyCache)

    const collectDirectory = Effect.fn("Example.collectDirectory")(function* (root: string) {
      return yield* SynchronizedRef.modifyEffect(cache, (current) => {
        const cached = HashMap.get(current, root)

        if (Option.isSome(cached)) {
          const cachedEntry = Tuple.make(cached.value, current)
          return Effect.succeed(cachedEntry)
        }

        return pipe(
          loadRefactorExamplesAt(root),
          Effect.map((loaded) => {
            const next = HashMap.set(current, root, loaded)

            return Tuple.make(loaded, next)
          })
        )
      })
    })

    const collectDirectoryExamples = Effect.fn("Example.collectDirectoryExamples")(function* (
      root: string
    ) {
      const current = yield* SynchronizedRef.get(cache)

      return yield* pipe(
        HashMap.get(current, root),
        Option.match({
          onNone: () => collectDirectory(root),
          onSome: Effect.succeed
        })
      )
    })

    const succeedInlineExamples = Effect.fn("Example.succeedInlineExamples")(
      flow(Struct.get<InlineRefactorExamples, "examples">("examples"), Effect.succeed)
    )

    const collectDirectorySource = Effect.fn("Example.collectDirectorySource")(function* (
      directory: DirectoryRefactorExamples
    ) {
      return yield* collectDirectoryExamples(directory.root)
    })

    const resolve = Effect.fn("Example.resolve")(function* (source: RefactorExampleSource) {
      return yield* pipe(
        Match.value(source),
        Match.tag("inline", succeedInlineExamples),
        Match.tag("directory", collectDirectorySource),
        Match.exhaustive
      )
    })

    return resolve
  }
)

const workspacePolicyMatcher = Struct.get<WorkspacePolicy, "matcher">("matcher")

export const toWorkspacePolicies =
  (policies: ReadonlyArray<WorkspacePolicy>) =>
  (context: WorkspaceContext): ReadonlyArray<ReadonlyArray<Detection>> => {
    const matchers = Array.map(policies, workspacePolicyMatcher)
    const matchesByPolicy = runWorkspaceMatchers(matchers)(context)

    return detectionsForLocatedPolicies(context)(context.workspaceRoot)(policies)(matchesByPolicy)
  }

// --- report blocks because matched wirings emit one ordered batch ---

const makeAdviceReportBlock =
  (advice: Advice) =>
  (examples: ReadonlyArray<RefactorExample>): ReportBlock => {
    const pathLabel = advicePath(advice)

    const key = AdviceReportKey.make({
      level: advice.level,
      path: pathLabel,
      title: advice.title
    })

    const text = adviceText(examples)(advice)

    return ReportBlock.make({ key, text })
  }

// Advice blocks keep a stable sort order because consumers rely on that presentation order.
const adviceReportBlocks =
  (resolve: ResolveRefactorExamples) =>
  (advice: ReadonlyArray<Advice>): Effect.Effect<ReadonlyArray<ReportBlock>, ExampleLoadError> => {
    const ordered = Array.sort(advice, adviceOrder)

    const resolveAdviceReportBlock = (item: Advice) =>
      pipe(resolve(item.examples), Effect.map(makeAdviceReportBlock(item)))

    return Effect.forEach(ordered, resolveAdviceReportBlock)
  }

// Local blocks keep the rule key kind because existing NDJSON consumers already key that way.
const checkReportBlocks =
  (name: string) =>
  (elements: ReadonlyArray<Detection>) =>
  (examples: ReadonlyArray<RefactorExample>): ReadonlyArray<ReportBlock> =>
    pipe(
      Array.groupBy(elements, detectionBlockKey),
      Record.values,
      Array.map((group) => {
        const first = Array.headNonEmpty(group)

        const key = RuleReportKey.make({
          name,
          message: first.message,
          hint: first.hint
        })

        const text = pipe(
          group,
          Array.matchLeft({
            onEmpty: () => name,
            onNonEmpty: (head) => {
              const message = `  ${head.message}`
              const hint = `  Hint: ${head.hint}`
              const examplesText = Array.map(examples, formatRefactorExample)
              const prefixLines2 = Array.make(name, message, hint)
              const header = Array.appendAll(prefixLines2, examplesText)
              const locations = Array.map(group, locationText)
              const lines = Array.appendAll(header, locations)

              return Array.join(lines, "\n")
            }
          })
        )

        return ReportBlock.make({ key, text })
      })
    )

const hasDetections = (signal: Signal) => signal.detections.length > 0

// Empty signals skip example loading because they render no report block.
const reportBlocks =
  (resolve: ResolveRefactorExamples) =>
  (signals: ReadonlyArray<Signal>) =>
  (advice: ReadonlyArray<Advice>): Effect.Effect<ReadonlyArray<ReportBlock>, ExampleLoadError> => {
    const adviceBlocks = adviceReportBlocks(resolve)(advice)

    const resolveSignalBlocks = (signal: Signal) =>
      pipe(resolve(signal.examples), Effect.map(checkReportBlocks(signal.name)(signal.detections)))

    const signalBlocks = pipe(
      signals,
      Array.filter(Struct.get("reported")),
      Array.filter(hasDetections),
      Effect.forEach(resolveSignalBlocks),
      Effect.map(Array.flatten)
    )

    return pipe(
      Effect.all({ adviceBlocks, signalBlocks }),
      Effect.map(({ adviceBlocks, signalBlocks }) => Array.appendAll(adviceBlocks, signalBlocks))
    )
  }

export const batchReportBlocks = (config: WiringConfig) => (resolve: ResolveRefactorExamples) =>
  Effect.fn("Report.batchBlocks")(function* (wiringSignals: ReadonlyArray<WiringSignals>) {
    const matchedEntries = pipe(
      Array.zip(config, wiringSignals),
      Array.filter(([, current]) => current.matched)
    )

    const signals = Array.flatMap(matchedEntries, ([, current]) => current.signals)

    const adviceGroups = Array.map(matchedEntries, ([entry, current]) =>
      entry.wiring.derive(current.signals)
    )

    const advice = Array.flatten(adviceGroups)

    return yield* reportBlocks(resolve)(signals)(advice)
  })

// Empty stays an explicit event because consumers need a positive nothing-found report.
export const initialReportEvents =
  (rootPath: string) =>
  (blocks: ReadonlyArray<ReportBlock>): ReadonlyArray<ReportEvent> => {
    if (strictEqual(0)(blocks.length)) {
      const emptyReportEvent = EmptyReportEvent.make({ rootPath })

      return Array.of(emptyReportEvent)
    }

    const signalEventFromBlock = (block: ReportBlock) =>
      SignalEvent.make({ key: block.key, text: block.text })

    return Array.map(blocks, signalEventFromBlock)
  }

// --- wiring collection because policies accumulate detections per entry ---

const emptySeenBuckets = (entry: WiringEntry) =>
  Array.makeBy(entry.wiring.policies.length, () =>
    pipe(HashMap.empty<string, ReadonlyArray<Detection>>(), HashMap.beginMutation)
  )

const emptyElementBuckets = (entry: WiringEntry) =>
  Array.makeBy(entry.wiring.policies.length, () => MutableList.make<Detection>())

const detectionIsIncluded =
  (workspaceRoot: string, projectRoot: string, matchers: ReadonlyArray<GlobMatcher>) =>
  (element: Detection) => {
    const detectionPath = relativeWorkspacePath(workspaceRoot, projectRoot, element.location.path)
    const isIncluded = matchesFile(matchers)

    return isIncluded(detectionPath)
  }

const appendIncludedDetections = (
  workspaceRoot: string,
  projectRoot: string,
  matchers: ReadonlyArray<GlobMatcher>,
  seen: HashMap.HashMap<string, ReadonlyArray<Detection>>,
  elements: MutableList.MutableList<Detection>,
  detections: ReadonlyArray<Detection>
) => {
  const isIncluded = detectionIsIncluded(workspaceRoot, projectRoot, matchers)
  const includedDetections = Array.filter(detections, isIncluded)
  const append = appendDetection(seen, elements)

  Array.forEach(includedDetections, append)

  return includedDetections.length
}

const matchersForEntry = (entry: WiringEntry) => Array.map(entry.files, compileGlobMatcher)

const emptyWorkspaceFileBuckets = (_entry: WiringEntry) =>
  pipe(HashMap.empty<string, WorkspaceSourceFile>(), HashMap.beginMutation)

const collectWorkspaceFileForMatch = (
  workspaceFilesByWiring: ReadonlyArray<MutableWorkspaceFiles>,
  matchedWiringIndexes: HashMap.HashMap<number, true>,
  sourceFile: ts.SourceFile,
  candidatePath: string,
  matched: boolean,
  wiringIndex: number
) => {
  const maybeWorkspaceFiles = Array.get(workspaceFilesByWiring, wiringIndex)

  const collectNewPath = (workspaceFiles: MutableWorkspaceFiles) => {
    const alreadyCollected = HashMap.has(workspaceFiles, candidatePath)
    const isNewCollection = !alreadyCollected

    if (isNewCollection) {
      HashMap.set(matchedWiringIndexes, wiringIndex, true)

      const workspaceSourceFile = new WorkspaceSourceFile({
        path: candidatePath,
        sourceFile
      })

      HashMap.set(workspaceFiles, candidatePath, workspaceSourceFile)
    }

    return isNewCollection
  }

  const collectMatchedWorkspaceFiles = (workspaceFiles: MutableWorkspaceFiles) =>
    matched && collectNewPath(workspaceFiles)

  return pipe(
    maybeWorkspaceFiles,
    Option.map(collectMatchedWorkspaceFiles),
    Option.getOrElse(Function.constFalse)
  )
}

const sourceMatchRecord = (
  workspaceRoot: string,
  projectRoot: string,
  matchersByWiring: ReadonlyArray<ReadonlyArray<GlobMatcher>>,
  sourceFile: ts.SourceFile
) => {
  const candidatePath = relativeWorkspacePath(workspaceRoot, projectRoot, sourceFile.fileName)
  const matches = Array.map(matchersByWiring, Function.flip(matchesFile)(candidatePath))

  return SourceMatch.make({ sourceFile, candidatePath, matches })
}

const collectProgramPolicyDetections = (
  workspaceRoot: string,
  context: ProgramContext,
  programSlots: ReadonlyArray<ProgramPolicySlot>,
  matchersByWiring: ReadonlyArray<ReadonlyArray<GlobMatcher>>,
  seenByWiring: ReadonlyArray<MutableSeenBuckets>,
  elementsByWiring: ReadonlyArray<MutableElementBuckets>,
  detectionsByProgramPolicy: ReadonlyArray<ReadonlyArray<Detection>>
) => {
  Array.forEach(detectionsByProgramPolicy, (detections, programPolicyIndex) => {
    const maybeSlot = Array.get(programSlots, programPolicyIndex)

    if (Option.isNone(maybeSlot)) {
      return
    }

    const maybeMatchers = Array.get(matchersByWiring, maybeSlot.value.wiringIndex)

    if (Option.isNone(maybeMatchers)) {
      return
    }

    const maybeStorage = storageForSlot(
      seenByWiring,
      elementsByWiring,
      maybeSlot.value.wiringIndex,
      maybeSlot.value.policyIndex
    )

    if (Option.isNone(maybeStorage)) {
      return
    }

    appendIncludedDetections(
      workspaceRoot,
      context.projectRoot,
      maybeMatchers.value,
      maybeStorage.value.seen,
      maybeStorage.value.elements,
      detections
    )
  })

  return detectionsByProgramPolicy.length
}

const programPolicySlotFromEntry =
  (wiringIndex: number) => (policy: WiringPolicy, policyIndex: number) => {
    if (!isProgramPolicy(policy)) {
      return Result.failVoid
    }

    const slot = ProgramPolicySlot.make({ wiringIndex, policyIndex, policy })

    return Result.succeed(slot)
  }

const collectSourceMatch = (
  workspaceFilesByWiring: ReadonlyArray<MutableWorkspaceFiles>,
  matchedWiringIndexes: HashMap.HashMap<number, true>
) => {
  const collectMatch = (sourceMatch: SourceMatch) => {
    Array.forEach(sourceMatch.matches, (matched, wiringIndex) => {
      collectWorkspaceFileForMatch(
        workspaceFilesByWiring,
        matchedWiringIndexes,
        sourceMatch.sourceFile,
        sourceMatch.candidatePath,
        matched,
        wiringIndex
      )
    })

    return sourceMatch.matches.length
  }

  return collectMatch
}

const includesSourceFileForSlots =
  (
    programSlots: ReadonlyArray<ProgramPolicySlot>,
    matchesByFileName: HashMap.HashMap<string, ReadonlyArray<boolean>>
  ) =>
  (programPolicyIndex: number, sourceFile: ts.SourceFile) => {
    const maybeSlot = Array.get(programSlots, programPolicyIndex)
    const maybeMatches = HashMap.get(matchesByFileName, sourceFile.fileName)

    const includedByWiringIndex = (slot: ProgramPolicySlot) =>
      pipe(maybeMatches, Option.flatMap(Array.get(slot.wiringIndex)))

    const maybeIncluded = pipe(maybeSlot, Option.flatMap(includedByWiringIndex))

    return pipe(maybeIncluded, Option.getOrElse(Function.constFalse))
  }

const runProgramPoliciesForContext =
  (programPolicies: ReadonlyArray<Policy>) =>
  (
    programSlots: ReadonlyArray<ProgramPolicySlot>,
    matchesByFileName: HashMap.HashMap<string, ReadonlyArray<boolean>>,
    context: ProgramContext
  ) => {
    const includesSourceFile = includesSourceFileForSlots(programSlots, matchesByFileName)
    const configuredPolicies = toPolicies(programPolicies)(includesSourceFile)

    return configuredPolicies(context)
  }

const isZero = strictEqual(0)

const makeWorkspacePolicySlot = (policyIndex: number, policy: WorkspacePolicy) =>
  Tuple.make(policyIndex, policy)

const workspacePolicySlot = (policy: WiringPolicy, policyIndex: number) => {
  if (!isWorkspacePolicy(policy)) {
    return Result.failVoid
  }

  const slot = makeWorkspacePolicySlot(policyIndex, policy)

  return Result.succeed(slot)
}

const collectWorkspacePolicyDetections = (
  workspaceRoot: string,
  config: WiringConfig,
  workspaceFilesByWiring: ReadonlyArray<MutableWorkspaceFiles>,
  seenByWiring: ReadonlyArray<MutableSeenBuckets>,
  elementsByWiring: ReadonlyArray<MutableElementBuckets>
) => {
  Array.forEach(config, (entry, wiringIndex) => {
    const workspaceSlots = Array.filterMap(entry.wiring.policies, workspacePolicySlot)

    if (isZero(workspaceSlots.length)) {
      return
    }

    const maybeWorkspaceFiles = Array.get(workspaceFilesByWiring, wiringIndex)

    if (Option.isNone(maybeWorkspaceFiles)) {
      return
    }

    const workspaceFileValues = HashMap.values(maybeWorkspaceFiles.value)
    const sourceFiles = Array.fromIterable(workspaceFileValues)
    const workspaceContext = new WorkspaceContext({ workspaceRoot, sourceFiles })
    const workspacePolicies = Array.map(workspaceSlots, Tuple.get(1))
    const detectionsByWorkspacePolicy = toWorkspacePolicies(workspacePolicies)(workspaceContext)

    Array.forEach(detectionsByWorkspacePolicy, (detections, workspacePolicyIndex) => {
      const maybeSlot = Array.get(workspaceSlots, workspacePolicyIndex)

      if (Option.isNone(maybeSlot)) {
        return
      }

      const policyIndex = Tuple.get(maybeSlot.value, 0)
      const maybeStorage = storageForSlot(seenByWiring, elementsByWiring, wiringIndex, policyIndex)

      if (Option.isNone(maybeStorage)) {
        return
      }

      const store = appendDetection(maybeStorage.value.seen, maybeStorage.value.elements)

      Array.forEach(detections, store)
    })
  })

  return config.length
}

const makeSignalForPolicy = (
  elementsByWiring: ReadonlyArray<MutableElementBuckets>,
  wiringIndex: number,
  policy: WiringPolicy,
  policyIndex: number
) => {
  const maybeWiringElements = Array.get(elementsByWiring, wiringIndex)

  const elementsAtPolicy = (wiringElements: MutableElementBuckets) =>
    Array.get(wiringElements, policyIndex)

  const maybeElements = pipe(maybeWiringElements, Option.flatMap(elementsAtPolicy))

  const detections = pipe(
    maybeElements,
    Option.map(MutableList.toArray),
    Option.getOrElse(noDetections)
  )

  return new Signal({
    name: policy.name,
    reported: policy.reported,
    detections,
    examples: policy.examples
  })
}

const makeWiringSignalsForEntry =
  (
    elementsByWiring: ReadonlyArray<MutableElementBuckets>,
    matchedWiringIndexSet: HashMap.HashMap<number, true>
  ) =>
  (entry: WiringEntry, wiringIndex: number) => {
    const makeSignal = (policy: WiringPolicy, policyIndex: number) =>
      makeSignalForPolicy(elementsByWiring, wiringIndex, policy, policyIndex)

    const signals = Array.map(entry.wiring.policies, makeSignal)
    const matched = HashMap.has(matchedWiringIndexSet, wiringIndex)

    return new WiringSignals({
      matched,
      signals
    })
  }

// Sequential project loading is required because every Program can exhaust the heap.
export const workspaceSignalsForProjects =
  (config: WiringConfig) =>
  (workspaceRoot: string) =>
  <A>(projects: ReadonlyArray<A>) =>
  (toContext: (project: A) => ProgramContext): Effect.Effect<ReadonlyArray<WiringSignals>> => {
    const matchersByWiring = Array.map(config, matchersForEntry)
    const seenByWiring = Array.map(config, emptySeenBuckets)
    const elementsByWiring = Array.map(config, emptyElementBuckets)
    const workspaceFilesByWiring = Array.map(config, emptyWorkspaceFileBuckets)

    const programSlots = Array.flatMap(config, (entry, wiringIndex) =>
      Array.filterMap(entry.wiring.policies, programPolicySlotFromEntry(wiringIndex))
    )

    const programPolicies = Array.map(
      programSlots,
      Struct.get<ProgramPolicySlot, "policy">("policy")
    )

    const matchedWiringIndexes = pipe(HashMap.empty<number, true>(), HashMap.beginMutation)
    const collectMatch = collectSourceMatch(workspaceFilesByWiring, matchedWiringIndexes)

    const collectProject = Effect.fn("Wiring.collectProject")(function* (project: A) {
      yield* Effect.sync(() => {
        const loadedContext = toContext(project)

        // Contexts re-root here because evidence compares paths across the workspace.
        const context = ProgramContext.make({
          program: loadedContext.program,
          checker: loadedContext.checker,
          projectRoot: loadedContext.projectRoot,
          workspaceRoot
        })

        const allSourceFiles = context.program.getSourceFiles()
        const sourceFiles = Array.filter(allSourceFiles, isProjectSourceFile)

        const sourceMatchForFile = (sourceFile: ts.SourceFile) =>
          sourceMatchRecord(workspaceRoot, context.projectRoot, matchersByWiring, sourceFile)

        const sourceMatches = Array.map(sourceFiles, sourceMatchForFile)

        Array.forEach(sourceMatches, collectMatch)

        const fileMatchFromSourceMatch = (sourceMatch: SourceMatch) =>
          Tuple.make(sourceMatch.sourceFile.fileName, sourceMatch.matches)

        const fileMatches = Array.map(sourceMatches, fileMatchFromSourceMatch)
        const matchesByFileName = HashMap.fromIterable(fileMatches)

        const detectionsByProgramPolicy = runProgramPoliciesForContext(programPolicies)(
          programSlots,
          matchesByFileName,
          context
        )

        collectProgramPolicyDetections(
          workspaceRoot,
          context,
          programSlots,
          matchersByWiring,
          seenByWiring,
          elementsByWiring,
          detectionsByProgramPolicy
        )
      })
    })

    return pipe(
      Effect.forEach(projects, collectProject, { discard: true }),
      Effect.map(() => {
        collectWorkspacePolicyDetections(
          workspaceRoot,
          config,
          workspaceFilesByWiring,
          seenByWiring,
          elementsByWiring
        )

        const matchedWiringIndexSet = HashMap.endMutation(matchedWiringIndexes)
        const toWiringSignals = makeWiringSignalsForEntry(elementsByWiring, matchedWiringIndexSet)

        return Array.map(config, toWiringSignals)
      })
    )
  }

// --- watch events because each update yields one complete snapshot ---

const reportEventsForResolver = (config: WiringConfig) => (update: WorkspaceUpdate) =>
  Effect.fn("Watch.reportEventsForResolver")(function* (resolve: ResolveRefactorExamples) {
    const signals = yield* workspaceSignalsForProjects(config)(update.rootPath)(update.contexts)(
      Function.identity
    )

    const blocks = yield* batchReportBlocks(config)(resolve)(signals)

    return initialReportEvents(update.rootPath)(blocks)
  })

// One update is complete because watch rebuilds a whole snapshot.
export const reportEvents = (config: WiringConfig) =>
  Effect.fn("Watch.reportEvents")(function* (update: WorkspaceUpdate) {
    return yield* pipe(
      makeRefactorExampleResolver(),
      Effect.flatMap(reportEventsForResolver(config)(update))
    )
  })
