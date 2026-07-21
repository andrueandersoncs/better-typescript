import { Array, Function, HashMap, Option, Result, Schema, Struct, Tuple, pipe } from "effect"
import type * as ts from "typescript"
import { WorkspaceSourceFile } from "@better-typescript/matchers/matcher/data"
import { ProgramContext } from "@better-typescript/matchers/sources/data"
import { TsSourceFile } from "@better-typescript/matchers/tsSchema"
import type { Detection } from "../location/data.js"
import { toPolicies } from "../policy/policy.js"
import type { Policy } from "../policy/data.js"
import { ProgramPolicySlot, isProgramPolicy, type WiringPolicy } from "./data.js"
import type { WiringEntry } from "./data.js"
import { matchesFile, type GlobMatcher, compileGlobMatcher } from "./globs.js"
import {
  appendIncludedDetections,
  relativeWorkspacePath,
  storageForSlot,
  type MutableElementBuckets,
  type MutableSeenBuckets
} from "./collectBuckets.js"

// MutableWorkspaceFiles keys workspace paths because collection mutates across projects.
export type MutableWorkspaceFiles = HashMap.HashMap<string, WorkspaceSourceFile>

const booleanArraySchema = Schema.Array(Schema.Boolean)

// SourceMatch is the per-file match vector because collection and policies share one record.
export const SourceMatch = Schema.Struct({
  sourceFile: TsSourceFile,
  candidatePath: Schema.String,
  matches: booleanArraySchema
})

export interface SourceMatch extends Schema.Schema.Type<typeof SourceMatch> {}

export const slotPolicy = Struct.get<ProgramPolicySlot, "policy">("policy")

export const matchersForEntry = (entry: WiringEntry) => Array.map(entry.files, compileGlobMatcher)

export const emptyWorkspaceFileBuckets = (_entry: WiringEntry) =>
  pipe(HashMap.empty<string, WorkspaceSourceFile>(), HashMap.beginMutation)

const makeProgramPolicySlot = (wiringIndex: number, policyIndex: number, policy: Policy) =>
  ProgramPolicySlot.make({ wiringIndex, policyIndex, policy })

const makeWorkspaceSourceFile = (candidatePath: string, sourceFile: ts.SourceFile) =>
  new WorkspaceSourceFile({ path: candidatePath, sourceFile })

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
      const workspaceSourceFile = makeWorkspaceSourceFile(candidatePath, sourceFile)

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

export const sourceMatchRecord = (
  workspaceRoot: string,
  projectRoot: string,
  matchersByWiring: ReadonlyArray<ReadonlyArray<GlobMatcher>>,
  sourceFile: ts.SourceFile
) => {
  const candidatePath = relativeWorkspacePath(workspaceRoot, projectRoot, sourceFile.fileName)
  const matches = Array.map(matchersByWiring, Function.flip(matchesFile)(candidatePath))

  return SourceMatch.make({ sourceFile, candidatePath, matches })
}

export const collectProgramPolicyDetections = (
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

    const slot = maybeSlot.value
    const maybeMatchers = Array.get(matchersByWiring, slot.wiringIndex)

    if (Option.isNone(maybeMatchers)) {
      return
    }

    const maybeStorage = storageForSlot(
      seenByWiring,
      elementsByWiring,
      slot.wiringIndex,
      slot.policyIndex
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

export const programPolicySlotFromEntry =
  (wiringIndex: number) => (policy: WiringPolicy, policyIndex: number) => {
    if (!isProgramPolicy(policy)) {
      return Result.failVoid
    }

    const slot = makeProgramPolicySlot(wiringIndex, policyIndex, policy)

    return Result.succeed(slot)
  }

export const collectSourceMatch = (
  workspaceFilesByWiring: ReadonlyArray<MutableWorkspaceFiles>,
  matchedWiringIndexes: HashMap.HashMap<number, true>
) => {
  const collectMatch = (sourceMatch: SourceMatch) => {
    const sourceFile = sourceMatch.sourceFile
    const candidatePath = sourceMatch.candidatePath
    const matches = sourceMatch.matches

    Array.forEach(matches, (matched, wiringIndex) => {
      collectWorkspaceFileForMatch(
        workspaceFilesByWiring,
        matchedWiringIndexes,
        sourceFile,
        candidatePath,
        matched,
        wiringIndex
      )
    })

    return matches.length
  }

  return collectMatch
}

export const fileMatchFromSourceMatch = (sourceMatch: SourceMatch) => {
  const sourceFile = sourceMatch.sourceFile
  const matches = sourceMatch.matches

  return Tuple.make(sourceFile.fileName, matches)
}

export const includesSourceFileForSlots =
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

export const runProgramPoliciesForContext =
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
