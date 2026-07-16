import * as path from "node:path"
import { filter as compileFileGlob, makeRe } from "minimatch"
import type { MinimatchOptions } from "minimatch"
import {
  Array,
  Effect,
  Equal,
  Function,
  HashMap,
  HashSet,
  MutableList,
  Option,
  Predicate,
  Record,
  Result,
  Stream,
  Struct,
  Tuple,
  pipe
} from "effect"
import type * as ts from "typescript"
import type { Check } from "../check/data.js"
import {
  adviceOrder,
  adviceReportBlock,
  collectSignals,
  fileAdvicePath,
  isFileLevelAdvice
} from "../derive/derive.js"
import type { Advice } from "../derive/data.js"
import { formatRefactorExample } from "../example/example.js"
import type { NonEmptyRefactorExamples, RefactorExample } from "../example/data.js"
import type { Detection } from "../location/data.js"
import { detectionBlockKey, detectionEquals, locationText } from "../location/location.js"
import { isProjectSourceFile, runChecks } from "../sources/sources.js"
import { ProgramContext } from "../sources/data.js"
import { ClearedEvent, EmptyReportEvent, SignalEvent } from "../watch/data.js"
import type { ReportEvent } from "../watch/data.js"
import {
  DuplicateCheckNamesError,
  DuplicateNameState,
  InvalidWiringFilesError,
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

  return path.relative(workspaceRoot, absoluteCandidatePath).replaceAll(path.sep, "/")
}

const collectWorkspaceSignals = <A, E>(
  config: WiringConfig<E>,
  workspaceRoot: string,
  projects: ReadonlyArray<A>,
  toContext: (project: A) => ProgramContext
): Effect.Effect<ReadonlyArray<WiringSignals>> => {
  const matchersByWiring = Array.map(config, (entry) =>
    Array.map(entry.files, (pattern) => compileFileGlob(pattern, globOptions))
  )

  const seenByWiring = Array.map(config, (entry) =>
    Array.makeBy(entry.wiring.checks.length, () =>
      pipe(HashMap.empty<string, ReadonlyArray<Detection>>(), HashMap.beginMutation)
    )
  )

  const elementsByWiring = Array.map(config, (entry) =>
    Array.makeBy(entry.wiring.checks.length, () => MutableList.make<Detection>())
  )

  const seenByCheck = Array.flatten(seenByWiring)
  const elementsByCheck = Array.flatten(elementsByWiring)

  const checks = Array.flatMap(config, (entry) =>
    Array.map(entry.wiring.checks, Struct.get("check"))
  )

  const wiringIndexesByCheck = Array.flatMap(config, (entry, wiringIndex) =>
    Array.makeBy(entry.wiring.checks.length, () => wiringIndex)
  )

  const matchedWiringIndexes = pipe(HashMap.empty<number, true>(), HashMap.beginMutation)

  const collectProject = (project: A): Effect.Effect<void> =>
    Effect.sync(() => {
      const loadedContext = toContext(project)

      // Contexts re-root here because evidence must compare paths across the whole workspace.
      const context = new ProgramContext({
        program: loadedContext.program,
        checker: loadedContext.checker,
        projectRoot: loadedContext.projectRoot,
        workspaceRoot
      })

      const allSourceFiles = context.program.getSourceFiles()
      const sourceFiles = Array.filter(allSourceFiles, isProjectSourceFile)

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
            HashMap.set(matchedWiringIndexes, wiringIndex, true)
          }
        })
      )

      const fileMatches = Array.map(sourceMatches, ([sourceFile, matches]) =>
        Tuple.make(sourceFile.fileName, matches)
      )

      const matchesByFileName = HashMap.fromIterable(fileMatches)

      const includesSourceFile = (checkIndex: number, sourceFile: ts.SourceFile): boolean => {
        const wiringIndex = wiringIndexesByCheck[checkIndex]
        const matches = HashMap.getUnsafe(matchesByFileName, sourceFile.fileName)

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

          const isIncluded = Array.some(matchers, (matcher) => matcher(detectionPath))

          if (!isIncluded) {
            return
          }

          const seen = seenByCheck[checkIndex]
          const elements = elementsByCheck[checkIndex]
          const location = element.location

          const dedupeKeyParts = Array.make(
            location.path,
            location.line,
            location.column,
            element.message,
            element.hint
          )

          const key = JSON.stringify(dedupeKeyParts)
          const maybeBucket = HashMap.get(seen, key)
          const bucket = pipe(maybeBucket, Option.getOrElse(noDetections))

          const alreadySeen = Array.some(bucket, (candidate) =>
            Equal.equals(candidate.data, element.data)
          )

          if (alreadySeen) {
            return
          }

          const expandedBucket = Array.append(bucket, element)

          HashMap.set(seen, key, expandedBucket)
          MutableList.append(elements, element)
        })
      })
    })

  return pipe(
    Effect.forEach(projects, collectProject, { discard: true }),
    Effect.map(() => {
      const matchedWiringIndexSet = HashMap.endMutation(matchedWiringIndexes)

      return Array.map(config, (entry, wiringIndex) => {
        const signals = Array.map(entry.wiring.checks, (check, checkIndex) => {
          const elements = elementsByWiring[wiringIndex][checkIndex]
          const detections = MutableList.toArray(elements)

          return new Signal({
            name: check.name,
            reported: check.reported,
            detections,
            examples: check.examples
          })
        })

        const matched = HashMap.has(matchedWiringIndexSet, wiringIndex)

        return new WiringSignals({
          matched,
          signals
        })
      })
    })
  )
}

// Workspace root stays explicit because glob candidates normalize against one shared boundary.
export const workspaceSignals =
  <E>(config: WiringConfig<E>) =>
  (workspaceRoot: string) =>
  (contexts: ReadonlyArray<ProgramContext>): Effect.Effect<ReadonlyArray<WiringSignals>> =>
    collectWorkspaceSignals(config, workspaceRoot, contexts, Function.identity)

// Sequential project loading is required because retaining every Program can exhaust the heap.
export const workspaceSignalsForProjects =
  <E>(config: WiringConfig<E>) =>
  (workspaceRoot: string) =>
  <A>(projects: ReadonlyArray<A>) =>
  (toContext: (project: A) => ProgramContext): Effect.Effect<ReadonlyArray<WiringSignals>> =>
    collectWorkspaceSignals(config, workspaceRoot, projects, toContext)

// Derivation takes the full signal array because advice must see every signal from the same batch.
export const deriveAdvice =
  <E>(wiring: Wiring<E>) =>
  (signals: ReadonlyArray<Signal>): Effect.Effect<ReadonlyArray<Advice>, E> =>
    pipe(wiring.derive(signals), collectSignals)

const reportKeyIdentity = (kind: string, parts: ReadonlyArray<string>): string =>
  pipe(Array.prepend(parts, kind), JSON.stringify)

// Advice blocks keep a stable sort order because consumers rely on that presentation order.
export const adviceReportBlocks = (advice: ReadonlyArray<Advice>): ReadonlyArray<ReportBlock> =>
  pipe(advice, Array.sort(adviceOrder), Array.map(adviceReportBlock))

// Local blocks keep the rule key kind because existing NDJSON consumers already key that way.
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
        const identity = reportKeyIdentity("rule", ruleIdentityParts)

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

// Silent signals stay in the batch because derivation still needs them when they do not render.
export const reportBlocks =
  (signals: ReadonlyArray<Signal>) =>
  (advice: ReadonlyArray<Advice>): ReadonlyArray<ReportBlock> => {
    const adviceBlocks = adviceReportBlocks(advice)

    const signalBlocks = pipe(
      signals,
      Array.filter(Struct.get("reported")),
      Array.flatMap((signal) => checkReportBlocks(signal.name)(signal.examples)(signal.detections))
    )

    return Array.appendAll(adviceBlocks, signalBlocks)
  }

export const batchReportBlocks =
  <E>(config: WiringConfig<E>) =>
  (wiringSignals: ReadonlyArray<WiringSignals>): Effect.Effect<ReadonlyArray<ReportBlock>, E> => {
    const matchedEntries = pipe(
      Array.zip(config, wiringSignals),
      Array.filter(([, current]) => current.matched)
    )

    const signals = Array.flatMap(matchedEntries, ([, current]) => current.signals)

    const advice = Effect.forEach(matchedEntries, ([entry, current]) =>
      deriveAdvice(entry.wiring)(current.signals)
    )

    return pipe(advice, Effect.map(Array.flatten), Effect.map(reportBlocks(signals)))
  }

export const filterFallbackAdviceForUncoveredFiles =
  (specific: ReadonlyArray<Advice>) =>
  <E, R>(fallbackAdvice: Stream.Stream<Advice, E, R>): Stream.Stream<Advice, E, R> => {
    const fileAdvice = Array.filter(specific, isFileLevelAdvice)
    const paths = Array.map(fileAdvice, fileAdvicePath)
    const coveredFiles = HashSet.fromIterable(paths)

    return Stream.filter(fallbackAdvice, (advice) => {
      const isNotFileLevel = advice.level !== "file"
      const isUncoveredFile = !HashSet.has(coveredFiles, advice.location.path)

      return isNotFileLevel || isUncoveredFile
    })
  }

// Fallback suppression is required because fallback must not duplicate covered file-level advice.
export const withFallbackAdvice = <E, R>(
  specificAdvice: Stream.Stream<Advice, E, R>,
  fallbackAdvice: Stream.Stream<Advice, E, R>
): Stream.Stream<Advice, E, R> =>
  pipe(
    collectSignals(specificAdvice),
    Effect.map((specific) => {
      const fallback = filterFallbackAdviceForUncoveredFiles(specific)(fallbackAdvice)

      return pipe(Stream.fromIterable(specific), Stream.concat(fallback))
    }),
    Stream.unwrap
  )

const detectionsEquivalence = Array.makeEquivalence(detectionEquals)

export const signalEquals = (a: Signal, b: Signal): boolean => {
  const sameName = a.name === b.name
  const sameDetections = detectionsEquivalence(a.detections, b.detections)

  return sameName && sameDetections
}

const signalArrayEquivalence = Array.makeEquivalence(signalEquals)

export const wiringSignalsEquals = (a: WiringSignals, b: WiringSignals): boolean => {
  const sameMatchState = a.matched === b.matched
  const sameSignals = signalArrayEquivalence(a.signals, b.signals)

  return sameMatchState && sameSignals
}

export const wiringSignalsArrayEquivalence = Array.makeEquivalence(wiringSignalsEquals)

export const blockSignalEvent = (block: ReportBlock): SignalEvent =>
  new SignalEvent({ key: block.key, text: block.text })

export const blockClearedEvent = (block: ReportBlock): ClearedEvent =>
  new ClearedEvent({ key: block.key, text: block.cleared })

export const blockEntry = (block: ReportBlock): readonly [string, ReportBlock] =>
  Tuple.make(block.identity, block)

export const initialReportEvents =
  (rootPath: string) =>
  (blocks: ReadonlyArray<ReportBlock>): ReadonlyArray<ReportEvent> => {
    const emptyReportEvent = new EmptyReportEvent({ rootPath })
    return blocks.length === 0 ? Array.of(emptyReportEvent) : Array.map(blocks, blockSignalEvent)
  }

export const signalOf =
  (signals: ReadonlyArray<Signal>) =>
  (name: string): Stream.Stream<Detection> => {
    const namedSignal = Array.findFirst(signals, (signal) => signal.name === name)
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

const addDuplicateName = (state: DuplicateNameState, check: NamedCheck): DuplicateNameState => {
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

const validateCheckNames = <A>(checks: ReadonlyArray<NamedCheck>, value: A): A => {
  const names = Array.reduce(checks, emptyDuplicateNameState, addDuplicateName).names

  if (names.length === 0) {
    return value
  }

  const duplicateNamesError = new DuplicateCheckNamesError({ names })
  const failed = Effect.fail(duplicateNamesError)

  return Effect.runSync(failed)
}

export const makeWiring = <E = never>(
  definition: Pick<Wiring<E>, "checks" | "derive">
): Wiring<E> => {
  const wiring = new Wiring<E>(definition)
  return validateCheckNames(wiring.checks, wiring)
}

export const defineConfig = <E = never>(
  config: ReadonlyArray<Pick<WiringEntry<E>, "files" | "wiring">>
): WiringConfig<E> => {
  const invalidIndexes = Array.filterMap(config, (entry, index) => {
    const hasFiles = entry.files.length > 0
    const hasOnlyNonEmptyPatterns = Array.every(entry.files, isFileGlob)

    return hasFiles && hasOnlyNonEmptyPatterns ? Result.failVoid : Result.succeed(index)
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

    return new WiringEntry<E>({
      files: entry.files,
      wiring
    })
  })

  const checks = Array.flatMap(entries, (entry) => entry.wiring.checks)

  return validateCheckNames(checks, entries)
}
