import { Array, Function, Option, Struct, Tuple, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { ModuleGraphData } from "./architectureExploreData.js"
import { toWorkspacePath } from "./architectureExplore/paths.js"
import { ModuleEdge } from "./architectureExplore/moduleEdges.js"
import { evidenceMatcher, moduleEdges } from "./architectureExplore/architectureEvidence.js"
import { toRelativeFileName } from "../support/paths.js"
import { fileSubscriptions } from "@better-typescript/matchers/matcher"
import {
  makeNodeMatch,
  type Match,
  type MatchContext
} from "@better-typescript/matchers/matcher/data"

const buildIndex = (context: ProgramContext): readonly [ReadonlyArray<ModuleEdge>, string] => {
  const edges = moduleEdges(context)

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

const moduleGraphSubscriptions = Function.compose(moduleGraphElements, fileSubscriptions)

export const moduleGraph = evidenceMatcher(buildIndex)(moduleGraphSubscriptions)
