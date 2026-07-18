import { Array, Function, Option, Struct, Tuple, pipe } from "effect"
import { fileSubscriptions, makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

import { ModuleGraphData } from "./data.js"
import { ModuleEdge, toWorkspacePath } from "./programSymbols.js"
import { evidenceCheck, moduleEdges } from "./architectureEvidence.js"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { makeSilentCheck } from "../../defineCheck.js"
import { moduleGraphName } from "./names.js"

const message = "Module graph evidence — this Module imports other project Modules."

const hint =
  "Architecture Explore uses resolved edges to find connected bounce paths; an import count alone is not an architectural defect."

const buildIndex = (context: ProgramContext): readonly [ReadonlyArray<ModuleEdge>, string] => {
  const edges = moduleEdges(context)

  return Tuple.make(edges, context.projectRoot)
}

const moduleGraphElements =
  (index: readonly [ReadonlyArray<ModuleEdge>, string]) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    const [edges, projectRoot] = index
    const relative = toRelativeFileName(projectRoot)
    const filePath = relative(context.sourceFile.fileName)
    const workspaceRelative = toWorkspacePath(projectRoot, context.workspaceRoot)

    const importedPaths = pipe(
      edges,
      Array.filter((edge) => edge.importerPath === filePath),
      Array.map(Struct.get("importedPath")),
      Array.dedupe
    )

    if (importedPaths.length === 0) {
      return Array.empty()
    }

    const element = makeDetection(context)

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

    const reported = element({ node, message, hint, data })

    return Array.of(reported)
  }

const moduleGraphSubscriptions = Function.compose(moduleGraphElements, fileSubscriptions)

const moduleGraphCheck = evidenceCheck(buildIndex)(moduleGraphSubscriptions)

export const moduleGraph = makeSilentCheck(moduleGraphName, moduleGraphCheck)
