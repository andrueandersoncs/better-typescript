import * as path from "node:path"
import { filter as compileFileGlob } from "minimatch"
import type { MinimatchOptions } from "minimatch"
import {
  Array,
  Effect,
  Equal,
  Function,
  HashMap,
  MutableList,
  Option,
  Stream,
  Struct,
  Tuple,
  pipe
} from "effect"
import type * as ts from "typescript"
import type { Detection } from "../location/data.js"
import { detectionEquals } from "../location/location.js"
import { isProjectSourceFile, runChecks } from "../sources/sources.js"
import { ProgramContext } from "../sources/data.js"
import type { WiringConfig } from "../wiring/data.js"
import { Signal, WiringSignals } from "./data.js"

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const noDetections = Function.constant(emptyDetections)

const globOptions: MinimatchOptions = {
  dot: true,
  nonegate: true,
  platform: "linux"
}

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
          const examples = check.examples()

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
  (contexts: ReadonlyArray<ProgramContext>): Effect.Effect<ReadonlyArray<WiringSignals>> =>
    collectWorkspaceSignals(config, workspaceRoot, contexts, Function.identity)

// Sequential project loading is required because retaining every Program can exhaust the heap.
export const workspaceSignalsForProjects =
  <E>(config: WiringConfig<E>) =>
  (workspaceRoot: string) =>
  <A>(projects: ReadonlyArray<A>) =>
  (toContext: (project: A) => ProgramContext): Effect.Effect<ReadonlyArray<WiringSignals>> =>
    collectWorkspaceSignals(config, workspaceRoot, projects, toContext)

// Lookup stays on the materialized batch because derive helpers need random access to siblings.
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

const detectionsEquivalence = Array.makeEquivalence(detectionEquals)

// Name plus detections is the watch change gate because policy and examples are configuration.
export const signalEquals = (a: Signal, b: Signal): boolean => {
  const sameName = a.name === b.name
  const sameDetections = detectionsEquivalence(a.detections, b.detections)

  return sameName && sameDetections
}

const signalArrayEquivalence = Array.makeEquivalence(signalEquals)

// Match state participates because a newly matched or removed glob scope must reach derivation.
export const wiringSignalsEquals = (a: WiringSignals, b: WiringSignals): boolean => {
  const sameMatchState = a.matched === b.matched
  const sameSignals = signalArrayEquivalence(a.signals, b.signals)

  return sameMatchState && sameSignals
}

// One array equivalence exists because watch change gating compares whole signal batches.
export const wiringSignalsArrayEquivalence = Array.makeEquivalence(wiringSignalsEquals)
