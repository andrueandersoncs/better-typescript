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
  Struct,
  Tuple,
  flow,
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
import { compilerOptionsForChecks, runChecks } from "../check/check.js"
import { strictEqual } from "../equivalence.js"
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

const compileGlobMatcher = (pattern: string) => {
  const excluded = pattern.startsWith("!")
  const glob = excluded ? pattern.slice(1) : pattern

  return Tuple.make(excluded, compileFileGlob(glob, globOptions))
}

const matcherIncludesPath =
  (candidatePath: string) =>
  (matcher: ReturnType<typeof compileGlobMatcher>): boolean => {
    const isExclusion = Tuple.get(matcher, 0)
    const isInclusion = !isExclusion
    const matchPath = Tuple.get(matcher, 1)
    const matchesPath = matchPath(candidatePath)

    return isInclusion && matchesPath
  }

const matcherExcludesPath =
  (candidatePath: string) =>
  (matcher: ReturnType<typeof compileGlobMatcher>): boolean => {
    const isExclusion = Tuple.get(matcher, 0)
    const matchPath = Tuple.get(matcher, 1)
    const matchesPath = matchPath(candidatePath)

    return isExclusion && matchesPath
  }

const matchesFile =
  (matchers: ReadonlyArray<ReturnType<typeof compileGlobMatcher>>) =>
  (candidatePath: string): boolean => {
    const included = Array.some(matchers, matcherIncludesPath(candidatePath))
    const excluded = Array.some(matchers, matcherExcludesPath(candidatePath))
    const notExcluded = !excluded

    return included && notExcluded
  }

const hasNonWhitespace = (pattern: string) => pattern.trim().length > 0

// One glob predicate is canonical here because config loading and defineConfig must not drift.
export const isFileGlob = Predicate.and(Predicate.isString, hasNonWhitespace)

// Examples stay a source descriptor because construction must not load fixtures for reports.
export const makeNamedCheck = (name: string, check: Check, examples: RefactorExampleSource) =>
  new NamedCheck({
    name,
    check,
    reported: true,
    examples
  })

// Silent checks default to one empty source because callers should not allocate fresh empty arrays.
export const makeSilentCheck = (
  name: string,
  check: Check,
  examples: RefactorExampleSource = emptyRefactorExampleSource
) =>
  new NamedCheck({
    name,
    check,
    reported: false,
    examples
  })

const emptyDuplicateNamesSeen = HashSet.empty<string>()
const emptyDuplicateNameCollisions = HashSet.empty<string>()
const emptyDuplicateNames = Array.empty<string>()

const emptyDuplicateNameState = new DuplicateNameState({
  seen: emptyDuplicateNamesSeen,
  collisions: emptyDuplicateNameCollisions,
  names: emptyDuplicateNames
})

const failDuplicateCheckNames = (names: ReadonlyArray<string>) => {
  const error = new DuplicateCheckNamesError({ names })
  const failure = Effect.fail(error)

  return Effect.runSync(failure)
}

const failInvalidWiringFiles = (indexes: ReadonlyArray<number>) => {
  const error = new InvalidWiringFilesError({ indexes })
  const failure = Effect.fail(error)

  return Effect.runSync(failure)
}

const addDuplicateName = (state: DuplicateNameState, check: NamedCheck) => {
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

  return strictEqual(names.length, 0) ? value : failDuplicateCheckNames(names)
}

// Validation runs at construction because duplicate names must fail before analysis starts.
export const makeWiring = (definition: Pick<Wiring, "checks" | "derive">) => {
  const wiring = new Wiring(definition)
  return validateCheckNames(wiring.checks, wiring)
}

// Merged derive preserves member order because later advice must not reorder earlier emissions.
export const makeMergedWiring = (wirings: ReadonlyArray<Wiring>) => {
  const checks = Array.flatMap(wirings, Struct.get("checks"))
  const applyDerive = (signals: ReadonlyArray<Signal>) => (wiring: Wiring) => wiring.derive(signals)
  const derive: Wiring["derive"] = (signals) => Array.flatMap(wirings, applyDerive(signals))

  return makeWiring({ checks, derive })
}

const emptyDetections: ReadonlyArray<Detection> = Array.empty()

const checksFromEntry = (entry: WiringEntry) => Array.map(entry.wiring.checks, Struct.get("check"))

const matchersForEntry = (entry: WiringEntry) => Array.map(entry.files, compileGlobMatcher)

const emptySeenBuckets = (entry: WiringEntry) =>
  Array.makeBy(entry.wiring.checks.length, () =>
    pipe(HashMap.empty<string, ReadonlyArray<Detection>>(), HashMap.beginMutation)
  )

const emptyElementBuckets = (entry: WiringEntry) =>
  Array.makeBy(entry.wiring.checks.length, () => MutableList.make<Detection>())

// Compiler requirements follow enrolled Check order because the same fleet owns analysis semantics.
export const compilerOptionsForConfig: (config: WiringConfig) => ts.CompilerOptions = flow(
  Array.flatMap(checksFromEntry),
  compilerOptionsForChecks
)

// Glob compilation happens at config load because invalid patterns must not fail mid-analysis.
export const defineConfig = (
  config: ReadonlyArray<{
    readonly files: Array.NonEmptyReadonlyArray<string>
    readonly wiring: Pick<Wiring, "checks" | "derive">
  }>
): WiringConfig => {
  const invalidIndexes = Array.filterMap(config, (entry, index) => {
    const hasFiles = entry.files.length > 0
    const hasOnlyNonEmptyPatterns = Array.every(entry.files, isFileGlob)

    return hasFiles && hasOnlyNonEmptyPatterns ? Result.failVoid : Result.succeed(index)
  })

  if (invalidIndexes.length > 0) {
    return failInvalidWiringFiles(invalidIndexes)
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

const noDetections = Function.constant(emptyDetections)

const relativeWorkspacePath = (
  workspaceRoot: string,
  projectRoot: string,
  candidatePath: string
) => {
  const absoluteCandidatePath = path.resolve(projectRoot, candidatePath)

  return path.relative(workspaceRoot, absoluteCandidatePath).replaceAll(path.sep, "/")
}

// Sequential project loading is required because retaining every Program can exhaust the heap.
export const workspaceSignalsForProjects =
  (config: WiringConfig) =>
  (workspaceRoot: string) =>
  <A>(projects: ReadonlyArray<A>) =>
  (toContext: (project: A) => ProgramContext): Effect.Effect<ReadonlyArray<WiringSignals>> => {
    const matchersByWiring = Array.map(config, matchersForEntry)
    const seenByWiring = Array.map(config, emptySeenBuckets)
    const elementsByWiring = Array.map(config, emptyElementBuckets)
    const seenByCheck = Array.flatten(seenByWiring)
    const elementsByCheck = Array.flatten(elementsByWiring)
    const checks = Array.flatMap(config, checksFromEntry)

    const wiringIndexesByCheck = Array.flatMap(config, (entry, wiringIndex) =>
      Array.makeBy(entry.wiring.checks.length, () => wiringIndex)
    )

    const matchedWiringIndexes = pipe(HashMap.empty<number, true>(), HashMap.beginMutation)

    const collectProject = Effect.fn("Wiring.collectProject")(function* (project: A) {
      yield* Effect.sync(() => {
        const loadedContext = toContext(project)

        // Contexts re-root here because evidence must compare paths across the whole workspace.
        const context = ProgramContext.make({
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

          const matches = Array.map(matchersByWiring, Function.flip(matchesFile)(candidatePath))

          return Tuple.make(sourceFile, matches)
        })

        Array.forEach(sourceMatches, (sourceMatch) => {
          const matches = Tuple.get(sourceMatch, 1)

          Array.forEach(matches, (matched, wiringIndex) => {
            if (matched) {
              HashMap.set(matchedWiringIndexes, wiringIndex, true)
            }
          })
        })

        const fileMatches = Array.map(sourceMatches, (sourceMatch) => {
          const sourceFile = Tuple.get(sourceMatch, 0)
          const matches = Tuple.get(sourceMatch, 1)

          return Tuple.make(sourceFile.fileName, matches)
        })

        const matchesByFileName = HashMap.fromIterable(fileMatches)

        const includesSourceFile = (checkIndex: number, sourceFile: ts.SourceFile) => {
          const maybeWiringIndex = Array.get(wiringIndexesByCheck, checkIndex)
          const maybeMatches = HashMap.get(matchesByFileName, sourceFile.fileName)

          const includedByWiringIndex = (wiringIndex: number) =>
            pipe(maybeMatches, Option.flatMap(Array.get(wiringIndex)))

          const maybeIncluded = pipe(maybeWiringIndex, Option.flatMap(includedByWiringIndex))

          return pipe(maybeIncluded, Option.getOrElse(Function.constFalse))
        }

        const configuredChecks = runChecks(checks)(includesSourceFile)
        const detectionsByCheck = configuredChecks(context)

        Array.forEach(detectionsByCheck, (detections, checkIndex) => {
          const maybeWiringIndex = Array.get(wiringIndexesByCheck, checkIndex)

          if (Option.isNone(maybeWiringIndex)) {
            return
          }

          const wiringIndex = maybeWiringIndex.value
          const maybeMatchers = Array.get(matchersByWiring, wiringIndex)

          if (Option.isNone(maybeMatchers)) {
            return
          }

          const matchers = maybeMatchers.value

          Array.forEach(detections, (element) => {
            const detectionPath = relativeWorkspacePath(
              workspaceRoot,
              context.projectRoot,
              element.location.path
            )

            const isIncluded = matchesFile(matchers)(detectionPath)

            if (!isIncluded) {
              return
            }

            const maybeSeen = Array.get(seenByCheck, checkIndex)
            const maybeElements = Array.get(elementsByCheck, checkIndex)
            const maybeStorage = Option.all({ seen: maybeSeen, elements: maybeElements })

            if (Option.isNone(maybeStorage)) {
              return
            }

            const seen = maybeStorage.value.seen
            const elements = maybeStorage.value.elements
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
            const hasSameData = (candidate: Detection) => Equal.equals(candidate.data, element.data)
            const alreadySeen = Array.some(bucket, hasSameData)

            if (alreadySeen) {
              return
            }

            const expandedBucket = Array.append(bucket, element)

            HashMap.set(seen, key, expandedBucket)
            MutableList.append(elements, element)
          })
        })
      })
    })

    return pipe(
      Effect.forEach(projects, collectProject, { discard: true }),
      Effect.map(() => {
        const matchedWiringIndexSet = HashMap.endMutation(matchedWiringIndexes)

        return Array.map(config, (entry, wiringIndex) => {
          const signals = Array.map(entry.wiring.checks, (check, checkIndex) => {
            const maybeWiringElements = Array.get(elementsByWiring, wiringIndex)

            const elementsAtCheck = (
              wiringElements: ReadonlyArray<MutableList.MutableList<Detection>>
            ) => Array.get(wiringElements, checkIndex)

            const maybeElements = pipe(maybeWiringElements, Option.flatMap(elementsAtCheck))

            const detections = pipe(
              maybeElements,
              Option.map(MutableList.toArray),
              Option.getOrElse(noDetections)
            )

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
