import { Array, Effect, HashMap, pipe } from "effect"
import type * as ts from "typescript"
import { ProgramContext } from "@better-typescript/matchers/sources/data"
import { isProjectSourceFile } from "@better-typescript/matchers/sources"
import type { WiringConfig } from "./data.js"
import { emptyElementBuckets, emptySeenBuckets } from "./collectBuckets.js"
import {
  collectProgramPolicyDetections,
  collectSourceMatch,
  emptyWorkspaceFileBuckets,
  fileMatchFromSourceMatch,
  matchersForEntry,
  programPolicySlotFromEntry,
  runProgramPoliciesForContext,
  slotPolicy,
  sourceMatchRecord
} from "./collectProgram.js"
import { collectWorkspacePolicyDetections, makeWiringSignalsForEntry } from "./collectWorkspace.js"

// Sequential project loading is required because every Program can exhaust the heap.
export const workspaceSignalsForProjects =
  (config: WiringConfig) =>
  (workspaceRoot: string) =>
  <A>(projects: ReadonlyArray<A>) =>
  (
    toContext: (project: A) => ProgramContext
  ): Effect.Effect<ReadonlyArray<import("../signal/data.js").WiringSignals>> => {
    const matchersByWiring = Array.map(config, matchersForEntry)
    const seenByWiring = Array.map(config, emptySeenBuckets)
    const elementsByWiring = Array.map(config, emptyElementBuckets)
    const workspaceFilesByWiring = Array.map(config, emptyWorkspaceFileBuckets)

    const programSlots = Array.flatMap(config, (entry, wiringIndex) =>
      Array.filterMap(entry.wiring.policies, programPolicySlotFromEntry(wiringIndex))
    )

    const programPolicies = Array.map(programSlots, slotPolicy)
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
