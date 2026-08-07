import { Array, Function, Match, Option, flow, pipe } from "effect"
import type { DirectoryTarget } from "@better-typescript/matchers/matcher/directoryTarget"
import type { FileTarget } from "@better-typescript/matchers/matcher/fileTarget"
import type { Match as MatcherMatch } from "@better-typescript/matchers/matcher/match"
import type { NodeTarget } from "@better-typescript/matchers/matcher/nodeTarget"
import type { PositionTarget } from "@better-typescript/matchers/matcher/positionTarget"
import type { Target, WorkspaceTarget } from "@better-typescript/matchers/matcher/workspaceTarget"
import { Detection } from "../location/detectionData.js"
import { Location } from "../location/locationData.js"
import type { FindingSource } from "./findingSource.js"
import type { Policy } from "./policyClass.js"
import type { WorkspacePolicy } from "./workspacePolicyClass.js"
import { relativePathOrAbsolute } from "./relativePathOrAbsolute.js"

export const locateDirectory = (target: DirectoryTarget) => Location.make({ path: target.path })

const makeFileStartLocation = (fileName: string) =>
  Location.make({ path: fileName, line: 1, column: 1 })

const fileTargetPath = (root: string, target: FileTarget) =>
  relativePathOrAbsolute(root, target.sourceFile.fileName)

export const locateFileAt = (root: string) => {
  const pathForRoot = (target: FileTarget) => fileTargetPath(root, target)

  return flow(pathForRoot, makeFileStartLocation)
}

const nodeStartPosition = (node: NodeTarget) => {
  const sourceFile = node.node.getSourceFile()
  const start = node.node.getStart(sourceFile)

  return sourceFile.getLineAndCharacterOfPosition(start)
}

export const locateNodeAt = (root: string) => {
  const locate = (node: NodeTarget) => {
    const sourceFile = node.node.getSourceFile()
    const position = nodeStartPosition(node)
    const fileName = relativePathOrAbsolute(root, sourceFile.fileName)

    return Location.make({
      path: fileName,
      line: position.line + 1,
      column: position.character + 1
    })
  }

  return locate
}

export const locatePositionAt = (root: string) => {
  const locate = (target: PositionTarget) => {
    const fileName = relativePathOrAbsolute(root, target.sourceFile.fileName)

    return Location.make({ path: fileName, line: target.line, column: target.column })
  }

  return locate
}

export const locateWorkspace = (target: WorkspaceTarget) =>
  Location.make({ path: target.workspaceRoot })

// Match every Target tag once because program and workspace roots share that shape.
export const locateTargetAt = (root: string) => {
  const locateNode = locateNodeAt(root)
  const locateFile = locateFileAt(root)
  const locatePosition = locatePositionAt(root)
  const fallback = Location.make({ path: root })

  const locate = (target: Target) =>
    pipe(
      Match.value(target),
      Match.tag("NodeTarget", locateNode),
      Match.tag("FileTarget", locateFile),
      Match.tag("PositionTarget", locatePosition),
      Match.tag("DirectoryTarget", locateDirectory),
      Match.tag("WorkspaceTarget", locateWorkspace),
      Match.orElse(Function.constant(fallback))
    )

  return locate
}

// Build Detection from a locator because program and workspace policies share that finish.
export const detectionFromLocatedSource =
  (locate: (target: Target) => Location) => (source: FindingSource) => {
    const location = locate(source.target)

    return Detection.make({
      location,
      message: source.message,
      hint: source.hint,
      data: source.data
    })
  }

const emptyDetections = Array.empty<Detection>()

const detectionsForMatch =
  (toDetection: (source: FindingSource) => Detection) =>
  (guidanceForContext: (match: MatcherMatch<unknown>) => ReadonlyArray<FindingSource>) =>
  (match: MatcherMatch<unknown>) => {
    const sources = guidanceForContext(match)

    return Array.map(sources, toDetection)
  }

const detectionsForPolicyGuidance =
  <Context>(
    context: Context,
    toDetection: (source: FindingSource) => Detection,
    guidance: (context: Context) => (match: MatcherMatch<unknown>) => ReadonlyArray<FindingSource>
  ) =>
  (matches: ReadonlyArray<MatcherMatch<unknown>>) => {
    const guidanceForContext = guidance(context)
    const toDetections = detectionsForMatch(toDetection)(guidanceForContext)

    return Array.flatMap(matches, toDetections)
  }

type PolicyGuidance<Context> = (
  context: Context
) => (match: MatcherMatch<unknown>) => ReadonlyArray<FindingSource>

export const detectionsForPolicyMatches =
  <Context>(context: Context, toDetection: (source: FindingSource) => Detection) =>
  (policies: ReadonlyArray<Policy | WorkspacePolicy>) =>
  (matchesByPolicy: ReadonlyArray<ReadonlyArray<MatcherMatch<unknown>>>) =>
    Array.map(matchesByPolicy, (matches, policyIndex) => {
      const maybePolicy = Array.get(policies, policyIndex)

      if (Option.isNone(maybePolicy)) {
        return emptyDetections
      }

      return detectionsForPolicyGuidance(
        context,
        toDetection,
        maybePolicy.value.guidance as PolicyGuidance<Context>
      )(matches)
    })

// Finish rows at one locate root because both stages share that path.
export const detectionsForLocatedPolicies =
  <Context>(context: Context) =>
  (locateRoot: string) =>
  (policies: ReadonlyArray<Policy | WorkspacePolicy>) =>
  (
    matchesByPolicy: ReadonlyArray<ReadonlyArray<MatcherMatch<unknown>>>
  ): ReadonlyArray<ReadonlyArray<Detection>> => {
    const toDetection = detectionFromLocatedSource(locateTargetAt(locateRoot))
    const toDetections = detectionsForPolicyMatches(context, toDetection)(policies)

    return toDetections(matchesByPolicy)
  }
