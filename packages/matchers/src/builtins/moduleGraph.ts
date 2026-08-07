import { Array, Function, Option, Schema, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { toWorkspacePath } from "./architectureExplore/toWorkspacePath.js"
import { ModuleEdge } from "./architectureExplore/moduleEdge.js"
import { architectureEvidence } from "./architectureExplore/architectureEvidence.js"
import { toRelativeFileName } from "../support/paths.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { Match } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"

import { stringArray } from "./architectureExplore/stringArraySchema.js"
import { evidenceFileMatcher } from "./evidenceFileMatcher.js"

// ModuleGraphData carries project and workspace edges because advice joins graphs across packages.
export const ModuleGraphData = Schema.Struct({
  importedPaths: stringArray,
  workspacePath: Schema.String,
  importedWorkspacePaths: stringArray
})

export interface ModuleGraphData extends Schema.Schema.Type<typeof ModuleGraphData> {}

const buildIndex = (context: ProgramContext): readonly [ReadonlyArray<ModuleEdge>, string] => {
  const edges = architectureEvidence(context).moduleEdges

  return Tuple.make(edges, context.projectRoot)
}

const moduleGraphElements =
  (index: readonly [ReadonlyArray<ModuleEdge>, string]) =>
  (context: MatchContext): ReadonlyArray<Match<ModuleGraphData>> => {
    const [edges, projectRoot] = index
    const relative = toRelativeFileName(projectRoot)
    const filePath = relative(context.sourceFile.fileName)
    const workspaceRelative = toWorkspacePath(projectRoot, context.workspaceRoot)

    const importsFromFile = flow(
      Struct.get<(typeof edges)[number], "importerPath">("importerPath"),
      strictEqual(filePath)
    )

    const importedPaths = pipe(
      edges,
      Array.filter(importsFromFile),
      Array.map(Struct.get("importedPath")),
      Array.dedupe
    )

    if (strictEqual(0)(importedPaths.length)) {
      return Array.empty()
    }

    const node = pipe(
      Option.fromNullishOr(context.sourceFile.statements[0]),
      Option.getOrElse(Function.constant(context.sourceFile))
    )

    const workspacePath = workspaceRelative(filePath)
    const importedWorkspacePaths = Array.map(importedPaths, workspaceRelative)

    const data = ModuleGraphData.make({
      importedPaths,
      workspacePath,
      importedWorkspacePaths
    })

    const reported = makeNodeMatch(node, data)

    return Array.of(reported)
  }

export const moduleGraph = evidenceFileMatcher(buildIndex)(moduleGraphElements)
