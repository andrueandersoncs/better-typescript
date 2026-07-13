import * as path from "node:path"
import {
  Array,
  Chunk,
  Effect,
  Equal,
  flow,
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
import type {
  LoadedProject,
  LoadedWorkspace
} from "../../project/loadProject/data.js"
import { astNodes } from "../sources/sources.js"
import type { AstNodeElement } from "../sources/data.js"
import type { Check } from "../check/check.js"
import type { Detection } from "../location/data.js"
import { collectSignals } from "../derive/derive.js"
import type { Advice, EvidenceItem } from "../derive/data.js"
import type {
  ExampleSnippet,
  NonEmptyRefactorExamples,
  RefactorExample
} from "../example/data.js"
import {
  AdviceReportKey,
  DedupeState,
  DuplicateCheckNamesError,
  DuplicateNameState,
  NamedCheck,
  type NonEmptyCheckPaths,
  ReportBlock,
  RuleReportKey,
  Signal,
  Wiring
} from "./data.js"

const snapshotProject = (
  project: LoadedProject
): Effect.Effect<Chunk.Chunk<AstNodeElement>, Error> =>
  pipe(astNodes(project), Stream.runCollect)

const emptyDedupeState: DedupeState = {
  seen: HashMap.empty<string, ReadonlyArray<Detection>>(),
  elements: Array.empty()
}

const addUniqueElement = (
  state: DedupeState,
  element: Detection
): DedupeState => {
  const location = element.location

  const dedupeKeyParts = Array.make(
    location.path,
    location.line,
    location.column,
    element.message,
    element.hint
  )

  const key = JSON.stringify(dedupeKeyParts)

  const bucket = pipe(
    HashMap.get(state.seen, key),
    Option.getOrElse((): ReadonlyArray<Detection> => Array.empty())
  )

  const hasMatchingData = (candidate: Detection): boolean =>
    Equal.equals(candidate.data, element.data)

  const alreadySeen = Array.some(bucket, hasMatchingData)

  if (alreadySeen) {
    return state
  }

  const bucketWithElement = Array.append(bucket, element)
  const seen = HashMap.set(state.seen, key, bucketWithElement)
  const elements = Array.append(state.elements, element)

  return new DedupeState({ seen, elements })
}

const collectDetections =
  (check: Check) =>
  (
    nodes: Chunk.Chunk<AstNodeElement>
  ): Effect.Effect<Chunk.Chunk<Detection>, Error> => {
    const upstream = Stream.fromChunk(nodes)
    const signal = check(upstream)

    return Stream.runCollect(signal)
  }

const emptyDetectionChunk = Chunk.empty<Detection>()
const emptyDetectionEffect = Effect.succeed(emptyDetectionChunk)

/**
 * Run every wired check over one consistent set of project node snapshots.
 * Effect.forEach preserves wiring order, producing a complete finite batch.
 * @remarks Ordered finite batches are required because derivation consumes the
 * complete signal array from one consistent snapshot. Check paths resolve from
 * the workspace root and filter both inputs and emitted detections.
 */
export const workspaceSignals =
  (wiring: Wiring) =>
  (workspaceRoot: string) =>
  (
    snapshots: ReadonlyArray<Chunk.Chunk<AstNodeElement>>
  ): Effect.Effect<ReadonlyArray<Signal>, Error> => {
    const collectCheck = (check: NamedCheck): Effect.Effect<Signal, Error> => {
      const signalFromCollected = (
        collected: ReadonlyArray<Chunk.Chunk<Detection>>
      ): Signal => {
        const elements = Array.flatMap(collected, Chunk.toReadonlyArray)

        const deduped = Array.reduce(
          elements,
          emptyDedupeState,
          addUniqueElement
        )

        return new Signal({
          name: check.name,
          reported: check.reported,
          detections: deduped.elements,
          examples: check.examples
        })
      }

      const absolutePaths = Array.map(check.paths, (checkPath) =>
        path.resolve(workspaceRoot, checkPath)
      )

      const matchesPath = (candidatePath: string): boolean =>
        Array.some(absolutePaths, (rootPath) => {
          const relative = path.relative(rootPath, candidatePath)
          const isDirectParent = relative === ".."
          const isNestedParent = relative.startsWith(`..${path.sep}`)
          const isDifferentRoot = path.isAbsolute(relative)

          const outsideConditions = Array.make(
            isDirectParent,
            isNestedParent,
            isDifferentRoot
          )

          const isOutside = Array.some(outsideConditions, Boolean)

          return !isOutside
        })

      const collectScoped = (
        nodes: Chunk.Chunk<AstNodeElement>
      ): Effect.Effect<Chunk.Chunk<Detection>, Error> => {
        const matchesSourceFile = flow(
          (element: AstNodeElement) =>
            path.resolve(
              element.context.projectRoot,
              element.sourceFile.fileName
            ),
          matchesPath
        )

        const scopedNodes = Chunk.filter(nodes, matchesSourceFile)

        return pipe(
          scopedNodes,
          Chunk.head,
          Option.match({
            onNone: Function.constant(emptyDetectionEffect),
            onSome: (head) => {
              const matchesDetection = flow(
                (element: Detection) =>
                  path.resolve(head.context.projectRoot, element.location.path),
                matchesPath
              )

              return pipe(
                scopedNodes,
                collectDetections(check.check),
                Effect.map(Chunk.filter(matchesDetection))
              )
            }
          })
        )
      }

      const collectProject =
        check.paths.length === 0
          ? collectDetections(check.check)
          : collectScoped

      return pipe(
        Effect.forEach(snapshots, collectProject),
        Effect.map(signalFromCollected)
      )
    }

    return Effect.forEach(wiring.checks, collectCheck)
  }

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
 * One batch through the derivation stage into its keyed blocks; shared by the
 * snapshot report and the watch pipeline.
 * @remarks Shared so snapshot and watch reports stay identical because both
 * must render the same batch stages.
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
 * One workspace snapshot through the batch stages the watch pipeline reuses.
 * Engine surface for callers that need keyed blocks instead of rendered text.
 * @remarks Exposed as blocks because some callers need identities for deltas,
 * not only rendered report text.
 */
export const reportBlocksFromWiring =
  (wiring: Wiring) =>
  (
    workspace: LoadedWorkspace
  ): Effect.Effect<ReadonlyArray<ReportBlock>, Error> =>
    pipe(
      Effect.forEach(workspace.projects, snapshotProject),
      Effect.flatMap(workspaceSignals(wiring)(workspace.rootPath)),
      Effect.flatMap(batchReportBlocks(wiring))
    )

/**
 * The snapshot report: one workspace snapshot through the batch stages the
 * watch pipeline reuses. Library and test surface; the CLI watches instead.
 * @remarks Kept as a one-shot surface because library and test callers need
 * the same batch stages without starting a watcher.
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

const unscopedCheckPaths = Array.empty<string>()

export const namedCheck = (
  name: string,
  check: Check,
  examples: NonEmptyRefactorExamples
): NamedCheck =>
  new NamedCheck({
    name,
    check,
    reported: true,
    examples,
    paths: unscopedCheckPaths
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
    examples,
    paths: unscopedCheckPaths
  })

export const scopeCheck =
  (paths: NonEmptyCheckPaths) =>
  (check: NamedCheck): NamedCheck =>
    new NamedCheck({
      name: check.name,
      check: check.check,
      reported: check.reported,
      examples: check.examples,
      paths
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
