import * as path from "node:path"
import { filter as compileFileGlob, makeRe } from "minimatch"
import type { MinimatchOptions } from "minimatch"
import {
  Array,
  Effect,
  Equal,
  flow,
  Function,
  HashMap,
  HashSet,
  MutableHashMap,
  MutableHashSet,
  MutableList,
  Option,
  Order,
  Predicate,
  Record,
  Stream,
  Struct,
  Tuple,
  pipe
} from "effect"
import type * as ts from "typescript"
import type {
  LoadedProject,
  LoadedWorkspace,
  ProjectConfig,
  WorkspaceConfigs
} from "../../project/loadProject/data.js"
import { loadProjectConfig } from "../../project/loadProject/loadProject.js"
import { runChecks } from "../check/check.js"
import type { Check } from "../check/data.js"
import { collectSignals } from "../derive/derive.js"
import type { Advice, EvidenceItem } from "../derive/data.js"
import type {
  ExampleSnippet,
  NonEmptyRefactorExamples,
  RefactorExample
} from "../example/data.js"
import type { Detection } from "../location/data.js"
import { contextFor, isProjectSourceFile } from "../sources/sources.js"
import type { ProgramContext } from "../sources/data.js"
import {
  AdviceReportKey,
  DuplicateCheckNamesError,
  DuplicateNameState,
  InvalidWiringFilesError,
  MutableDedupeState,
  NamedCheck,
  ReportBlock,
  RuleReportKey,
  Signal,
  Wiring,
  WiringEntry,
  WiringSignals
} from "./data.js"
import type { WiringConfig } from "./data.js"

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const noDetections = Function.constant(emptyDetections)
const includeEverySourceFile = Function.constant(true)

const globOptions: MinimatchOptions = {
  dot: true,
  nonegate: true,
  platform: "linux"
}

const hasNonWhitespace = (pattern: string): boolean => pattern.trim().length > 0

const isFileGlob = Predicate.and(Predicate.isString, hasNonWhitespace)

const relativeWorkspacePath = (
  workspaceRoot: string,
  projectRoot: string,
  candidatePath: string
): string => {
  const absoluteCandidatePath = path.resolve(projectRoot, candidatePath)

  return path
    .relative(workspaceRoot, absoluteCandidatePath)
    .replaceAll(path.sep, "/")
}

const contextFromLoadedProject = (project: LoadedProject): ProgramContext => {
  const createContext = contextFor(project.rootPath)

  return createContext(project.program)
}

const contextFromProjectConfig: (config: ProjectConfig) => ProgramContext =
  flow(loadProjectConfig, contextFromLoadedProject)

const collectWorkspaceSignals = <A>(
  config: WiringConfig,
  workspaceRoot: string,
  projects: ReadonlyArray<A>,
  toContext: (project: A) => ProgramContext
): Effect.Effect<ReadonlyArray<WiringSignals>, Error> => {
  const matchersByWiring = Array.map(config, (entry) =>
    Array.map(entry.files, (pattern) => compileFileGlob(pattern, globOptions))
  )

  const emptyState = (): MutableDedupeState => {
    const seen = MutableHashMap.empty<string, ReadonlyArray<Detection>>()
    const elements = MutableList.empty<Detection>()

    return new MutableDedupeState({ seen, elements })
  }

  const statesByWiring = Array.map(config, (entry) =>
    Array.makeBy(entry.wiring.checks.length, emptyState)
  )

  const states = Array.flatten(statesByWiring)

  const checks = Array.flatMap(config, (entry) =>
    Array.map(entry.wiring.checks, Struct.get("check"))
  )

  const wiringIndexesByCheck = Array.flatMap(config, (entry, wiringIndex) =>
    Array.makeBy(entry.wiring.checks.length, () => wiringIndex)
  )

  const matchedWiringIndexes = MutableHashSet.empty<number>()

  const collectProject = (
    current: ReadonlyArray<MutableDedupeState>,
    project: A
  ): Effect.Effect<ReadonlyArray<MutableDedupeState>> =>
    Effect.sync(() => {
      const context = toContext(project)

      const sourceFiles = pipe(
        context.program.getSourceFiles(),
        Array.filter(isProjectSourceFile)
      )

      const sourceMatches = Array.map(sourceFiles, (sourceFile) => {
        const candidatePath = relativeWorkspacePath(
          workspaceRoot,
          context.projectRoot,
          sourceFile.fileName
        )

        const matches = Array.map(matchersByWiring, (matchers) =>
          Array.some(matchers, (matcher) => matcher(candidatePath))
        )

        return Tuple.make(sourceFile, matches)
      })

      Array.forEach(sourceMatches, ([, matches]) =>
        Array.forEach(matches, (matched, wiringIndex) => {
          if (matched) {
            MutableHashSet.add(matchedWiringIndexes, wiringIndex)
          }
        })
      )

      const fileMatches = Array.map(sourceMatches, ([sourceFile, matches]) =>
        Tuple.make(sourceFile.fileName, matches)
      )

      const matchesByFileName = HashMap.fromIterable(fileMatches)

      const includesSourceFile = (
        checkIndex: number,
        sourceFile: ts.SourceFile
      ): boolean => {
        const wiringIndex = wiringIndexesByCheck[checkIndex]

        const matches = HashMap.unsafeGet(
          matchesByFileName,
          sourceFile.fileName
        )

        return matches[wiringIndex] ?? false
      }

      const configuredChecks = runChecks(checks)(includesSourceFile)
      const detectionsByCheck = configuredChecks(context)

      Array.forEach(detectionsByCheck, (detections, checkIndex) => {
        const wiringIndex = wiringIndexesByCheck[checkIndex]
        const matchers = matchersByWiring[wiringIndex]

        Array.forEach(detections, (element) => {
          const detectionPath = relativeWorkspacePath(
            workspaceRoot,
            context.projectRoot,
            element.location.path
          )

          const isIncluded = Array.some(matchers, (matcher) =>
            matcher(detectionPath)
          )

          if (!isIncluded) {
            return
          }

          const state = current[checkIndex]
          const location = element.location

          const dedupeKeyParts = Array.make(
            location.path,
            location.line,
            location.column,
            element.message,
            element.hint
          )

          const key = JSON.stringify(dedupeKeyParts)
          const maybeBucket = MutableHashMap.get(state.seen, key)
          const bucket = pipe(maybeBucket, Option.getOrElse(noDetections))

          const alreadySeen = Array.some(bucket, (candidate) =>
            Equal.equals(candidate.data, element.data)
          )

          if (alreadySeen) {
            return
          }

          const expandedBucket = Array.append(bucket, element)

          MutableHashMap.set(state.seen, key, expandedBucket)
          MutableList.append(state.elements, element)
        })
      })

      return current
    })

  return pipe(
    Effect.reduce(projects, states, collectProject),
    Effect.map(() =>
      Array.map(config, (entry, wiringIndex) => {
        const signals = Array.map(entry.wiring.checks, (check, checkIndex) => {
          const state = statesByWiring[wiringIndex][checkIndex]
          const detections = Array.fromIterable(state.elements)

          return new Signal({
            name: check.name,
            reported: check.reported,
            detections,
            examples: check.examples
          })
        })

        const matched = MutableHashSet.has(matchedWiringIndexes, wiringIndex)

        return new WiringSignals({
          matched,
          signals
        })
      })
    )
  )
}

/**
 * Run every configured wiring over already-loaded program contexts.
 * @remarks The workspace root stays explicit because glob candidates are
 * normalized against one shared boundary.
 */
export const workspaceSignals =
  (config: WiringConfig) =>
  (workspaceRoot: string) =>
  (
    contexts: ReadonlyArray<ProgramContext>
  ): Effect.Effect<ReadonlyArray<WiringSignals>, Error> =>
    collectWorkspaceSignals(config, workspaceRoot, contexts, Function.identity)

/**
 * Build and analyze workspace projects one at a time so solution-style roots do
 * not retain every TypeScript Program simultaneously.
 * @remarks Sequential loading is required because retaining every Program in a
 * large solution workspace exhausts the JavaScript heap.
 */
export const workspaceSignalsFromConfigs =
  (config: WiringConfig) =>
  (
    workspace: WorkspaceConfigs
  ): Effect.Effect<ReadonlyArray<WiringSignals>, Error> =>
    collectWorkspaceSignals(
      config,
      workspace.rootPath,
      workspace.projects,
      contextFromProjectConfig
    )

/**
 * Within one batch, derivation consumes the complete materialized signal array.
 * @remarks Full-array input is required because advice must see every signal
 * from the same batch, not a partial stream.
 */
export const deriveAdvice =
  (wiring: Wiring) =>
  (
    signals: ReadonlyArray<Signal>
  ): Effect.Effect<ReadonlyArray<Advice>, Error> =>
    pipe(wiring.derive(signals), collectSignals)

export const runCheckOnProject =
  (check: Check) =>
  (project: LoadedProject): Effect.Effect<ReadonlyArray<Detection>, Error> =>
    Effect.sync(() => {
      const context = contextFromLoadedProject(project)
      const singleCheck = Array.of(check)
      const checksInEveryFile = runChecks(singleCheck)(includeEverySourceFile)
      const detections = checksInEveryFile(context)

      return pipe(detections, Array.head, Option.getOrElse(noDetections))
    })

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
  const evidence = Array.map(advice.evidence, evidenceText)
  const prefixLines = Array.make(header, remediation)
  const lines = Array.appendAll(prefixLines, evidence)

  return Array.join(lines, "\n")
}

const reportIdentity = (kind: string, parts: ReadonlyArray<string>): string =>
  pipe(Array.prepend(parts, kind), JSON.stringify)

const adviceReportBlock = (advice: Advice): ReportBlock => {
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

/**
 * Keyed advice blocks in report order: file advice first, then directory, then
 * project, each sorted by path.
 * @remarks Stable sort order is part of the report contract because consumers
 * rely on file-then-directory-then-project presentation.
 */
export const adviceReportBlocks = (
  advice: ReadonlyArray<Advice>
): ReadonlyArray<ReportBlock> =>
  pipe(advice, Array.sort(adviceOrder), Array.map(adviceReportBlock))

const detectionBlockKey = (element: Detection): string => {
  const detectionIdentityParts = Array.make(element.message, element.hint)
  return reportIdentity("detection", detectionIdentityParts)
}

const locationText = (element: Detection): string =>
  `  ${element.location.path}:${element.location.line}:${element.location.column}`

const formatExampleTree =
  (label: string) =>
  (files: ReadonlyArray<ExampleSnippet>): string => {
    const sections = Array.map(files, (snippet) => {
      const codeLines = snippet.code.split("\n")
      const indentedLines = Array.map(codeLines, (line) => `    ${line}`)
      const indentedCode = Array.join(indentedLines, "\n")

      return `  ${label} (${snippet.filePath}):\n${indentedCode}`
    })

    return Array.join(sections, "\n")
  }

const formatRefactorExample = (example: RefactorExample): string => {
  const badText = formatExampleTree("Bad")(example.bad)
  const goodText = formatExampleTree("Good")(example.good)

  const joinedParts = Array.make(badText, goodText)
  return Array.join(joinedParts, "\n")
}

/**
 * Keyed local detection blocks, one per distinct message and hint, groups in
 * insertion order. The key kind remains `rule` for NDJSON compatibility.
 * @remarks The `rule` key kind is retained because existing NDJSON consumers
 * already key local blocks that way.
 */
export const checkReportBlocks =
  (name: string) =>
  (examples: ReadonlyArray<RefactorExample>) =>
  (elements: ReadonlyArray<Detection>): ReadonlyArray<ReportBlock> =>
    pipe(
      Array.groupBy(elements, detectionBlockKey),
      Record.values,
      Array.map((group) => {
        const first = Array.headNonEmpty(group)

        const ruleIdentityParts = Array.make(name, first.message, first.hint)
        const identity = reportIdentity("rule", ruleIdentityParts)

        const key = new RuleReportKey({
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

        const cleared = `${name} — cleared: ${first.message}`

        return new ReportBlock({ identity, key, text, cleared })
      })
    )

/**
 * One batch's full keyed report: advice blocks first, then reported local
 * blocks in wiring order. Silent signals still ran and fed derivation.
 * @remarks Silent signals stay in the batch because derivation still needs
 * them even when they do not render.
 */
export const reportBlocks =
  (signals: ReadonlyArray<Signal>) =>
  (advice: ReadonlyArray<Advice>): ReadonlyArray<ReportBlock> => {
    const adviceBlocks = adviceReportBlocks(advice)

    const signalBlocks = pipe(
      signals,
      Array.filter(Struct.get("reported")),
      Array.flatMap((signal) =>
        checkReportBlocks(signal.name)(signal.examples)(signal.detections)
      )
    )

    return Array.appendAll(adviceBlocks, signalBlocks)
  }

/**
 * One batch through every matched wiring's independent derivation stage.
 * Advice is combined before rendering so aggregate blocks remain globally first,
 * while local blocks retain configuration-entry and check order.
 */
export const batchReportBlocks =
  (config: WiringConfig) =>
  (
    wiringSignals: ReadonlyArray<WiringSignals>
  ): Effect.Effect<ReadonlyArray<ReportBlock>, Error> => {
    const matchedEntries = pipe(
      Array.zip(config, wiringSignals),
      Array.filter(([, current]) => current.matched)
    )

    const signals = Array.flatMap(
      matchedEntries,
      ([, current]) => current.signals
    )

    const advice = Effect.forEach(matchedEntries, ([entry, current]) =>
      deriveAdvice(entry.wiring)(current.signals)
    )

    return pipe(
      advice,
      Effect.map(Array.flatten),
      Effect.map(reportBlocks(signals))
    )
  }

const isFileLevelAdvice = (advice: Advice): boolean => advice.level === "file"

const fileAdvicePath = (advice: Advice): string => advice.location.path

export const filterFallbackAdviceForUncoveredFiles =
  (specific: ReadonlyArray<Advice>) =>
  (
    fallbackAdvice: Stream.Stream<Advice, Error>
  ): Stream.Stream<Advice, Error> => {
    const fileAdvice = Array.filter(specific, isFileLevelAdvice)
    const paths = Array.map(fileAdvice, fileAdvicePath)
    const coveredFiles = HashSet.fromIterable(paths)

    return Stream.filter(fallbackAdvice, (advice) => {
      const isNotFileLevel = advice.level !== "file"
      const isUncoveredFile = !HashSet.has(coveredFiles, advice.location.path)

      return isNotFileLevel || isUncoveredFile
    })
  }

/**
 * Fallback suppression: file-level fallback advice is emitted only for files
 * where no file-level specific advice fired. Specific advice is collected once
 * and emitted before the applicable fallback advice.
 * @remarks Suppression is required because fallback must not duplicate
 * file-level advice that a specific rule already covered.
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
 * One loaded workspace through the batch stages the watch pipeline reuses.
 * Engine surface for callers that need keyed blocks instead of rendered text.
 */
export const reportBlocksFromConfig =
  (config: WiringConfig) =>
  (
    workspace: LoadedWorkspace
  ): Effect.Effect<ReadonlyArray<ReportBlock>, Error> =>
    pipe(
      workspace.projects,
      Array.map(contextFromLoadedProject),
      workspaceSignals(config)(workspace.rootPath),
      Effect.flatMap(batchReportBlocks(config))
    )

/** Analyze a discovered workspace while retaining at most one Program. */
export const reportBlocksFromWorkspaceConfigs =
  (config: WiringConfig) =>
  (
    workspace: WorkspaceConfigs
  ): Effect.Effect<ReadonlyArray<ReportBlock>, Error> =>
    pipe(
      workspaceSignalsFromConfigs(config)(workspace),
      Effect.flatMap(batchReportBlocks(config))
    )

export const reportFromConfig =
  (config: WiringConfig) =>
  (workspace: LoadedWorkspace): Stream.Stream<string, Error> =>
    pipe(
      reportBlocksFromConfig(config)(workspace),
      Stream.fromIterableEffect,
      Stream.map(Struct.get("text"))
    )

export const reportFromWorkspaceConfigs =
  (config: WiringConfig) =>
  (workspace: WorkspaceConfigs): Stream.Stream<string, Error> =>
    pipe(
      reportBlocksFromWorkspaceConfigs(config)(workspace),
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

export const namedCheck = (
  name: string,
  check: Check,
  examples: NonEmptyRefactorExamples
): NamedCheck =>
  new NamedCheck({
    name,
    check,
    reported: true,
    examples
  })

export const silentCheck = (
  name: string,
  check: Check,
  examples: ReadonlyArray<RefactorExample> = Array.empty()
): NamedCheck =>
  new NamedCheck({
    name,
    check,
    reported: false,
    examples
  })

const emptyDuplicateNamesSeen = HashSet.empty<string>()
const emptyDuplicateNameCollisions = HashSet.empty<string>()

const emptyDuplicateNames = Array.empty<string>()

const emptyDuplicateNameState: DuplicateNameState = new DuplicateNameState({
  seen: emptyDuplicateNamesSeen,
  collisions: emptyDuplicateNameCollisions,
  names: emptyDuplicateNames
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

const validateCheckNames = <A>(
  checks: ReadonlyArray<NamedCheck>,
  value: A
): A => {
  const names = Array.reduce(
    checks,
    emptyDuplicateNameState,
    addDuplicateName
  ).names

  if (names.length === 0) {
    return value
  }

  const duplicateNamesError = new DuplicateCheckNamesError({ names })
  const failed = Effect.fail(duplicateNamesError)

  return Effect.runSync(failed)
}

export const makeWiring = (wiring: Wiring): Wiring =>
  validateCheckNames(wiring.checks, wiring)

export const defineConfig = (config: WiringConfig): WiringConfig => {
  const invalidIndexes = Array.filterMap(config, (entry, index) => {
    const hasFiles = entry.files.length > 0

    const hasOnlyNonEmptyPatterns = Array.every(entry.files, isFileGlob)

    return hasFiles && hasOnlyNonEmptyPatterns
      ? Option.none()
      : Option.some(index)
  })

  if (invalidIndexes.length > 0) {
    const invalidFilesError = new InvalidWiringFilesError({
      indexes: invalidIndexes
    })

    const failed = Effect.fail(invalidFilesError)

    return Effect.runSync(failed)
  }

  const entries = Array.map(config, (entry) => {
    Array.forEach(entry.files, (pattern) => {
      makeRe(pattern, globOptions)
    })

    const wiring = makeWiring(entry.wiring)

    return new WiringEntry({
      files: entry.files,
      wiring
    })
  })

  const checks = Array.flatMap(entries, (entry) => entry.wiring.checks)

  return validateCheckNames(checks, entries)
}
