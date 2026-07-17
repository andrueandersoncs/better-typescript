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
  Result,
  Stream,
  Struct,
  Tuple,
  pipe
} from "effect"
import type * as ts from "typescript"
import type { Check } from "../check/data.js"
import type { RefactorExampleSource } from "../example/data.js"
import { emptyRefactorExampleSource } from "../example/example.js"
import type { Detection } from "../location/data.js"
import { Signal, WiringSignals } from "../signal/data.js"
import { ProgramContext } from "../sources/data.js"
import { isProjectSourceFile } from "../sources/sources.js"
import { runChecks } from "../check/check.js"
import {
  DuplicateCheckNamesError,
  DuplicateNameState,
  InvalidWiringFilesError,
  NamedCheck,
  Wiring,
  WiringEntry
} from "./data.js"
import type { WiringConfig } from "./data.js"

const globOptions: MinimatchOptions = {
  dot: true,
  nonegate: true,
  platform: "linux"
}

const hasNonWhitespace = (pattern: string): boolean => pattern.trim().length > 0

// One glob predicate is canonical here because config loading and defineConfig must not drift.
export const isFileGlob = Predicate.and(Predicate.isString, hasNonWhitespace)

// Examples stay a source descriptor because construction must not load fixtures for reports.
export const namedCheck = (
  name: string,
  check: Check,
  examples: RefactorExampleSource
): NamedCheck =>
  new NamedCheck({
    name,
    check,
    reported: true,
    examples
  })

// Silent checks default to one empty source because callers should not allocate fresh empty arrays.
export const silentCheck = (
  name: string,
  check: Check,
  examples: RefactorExampleSource = emptyRefactorExampleSource
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

// Validation runs at construction because duplicate names must fail before analysis starts.
export const makeWiring = <E = never>(
  definition: Pick<Wiring<E>, "checks" | "derive">
): Wiring<E> => {
  const wiring = new Wiring<E>(definition)
  return validateCheckNames(wiring.checks, wiring)
}

// Merged derive preserves member order because later advice must not reorder earlier emissions.
export const mergeWirings = <E = never>(wirings: ReadonlyArray<Wiring<E>>): Wiring<E> => {
  const checks = Array.flatMap(wirings, Struct.get("checks"))

  const derive: Wiring<E>["derive"] = (signals) => {
    const streams = Array.map(wirings, (wiring) => wiring.derive(signals))

    return pipe(
      Array.head(streams),
      Option.match({
        onNone: () => Stream.empty,
        onSome: (head) => {
          const rest = Array.drop(streams, 1)

          return Array.reduce(rest, head, (advice, next) => Stream.concat(advice, next))
        }
      })
    )
  }

  return makeWiring({ checks, derive })
}

// Glob compilation happens at config load because invalid patterns must not fail mid-analysis.
export const defineConfig = <E = never>(
  config: ReadonlyArray<{
    readonly files: Array.NonEmptyReadonlyArray<string>
    readonly wiring: Pick<Wiring<E>, "checks" | "derive">
  }>
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

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const noDetections = Function.constant(emptyDetections)

const relativeWorkspacePath = (
  workspaceRoot: string,
  projectRoot: string,
  candidatePath: string
): string => {
  const absoluteCandidatePath = path.resolve(projectRoot, candidatePath)

  return path.relative(workspaceRoot, absoluteCandidatePath).replaceAll(path.sep, "/")
}

// Sequential project loading is required because retaining every Program can exhaust the heap.
export const workspaceSignalsForProjects =
  <E>(config: WiringConfig<E>) =>
  (workspaceRoot: string) =>
  <A>(projects: ReadonlyArray<A>) =>
  (toContext: (project: A) => ProgramContext): Effect.Effect<ReadonlyArray<WiringSignals>> => {
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

          return pipe(
            HashMap.get(matchesByFileName, sourceFile.fileName),
            Option.map((matches) => matches[wiringIndex] ?? false),
            Option.getOrElse(Function.constFalse)
          )
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
            const examples = check.examples

            return new Signal({
              name: check.name,
              reported: check.reported,
              detections,
              examples
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
  (contexts: ReadonlyArray<ProgramContext>): Effect.Effect<ReadonlyArray<WiringSignals>> => {
    const collectContexts = workspaceSignalsForProjects(config)(workspaceRoot)(contexts)

    return collectContexts(Function.identity)
  }
