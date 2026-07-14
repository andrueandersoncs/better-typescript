import { Array, Data, Function, Option, Struct, pipe } from "effect"
import {
  fileSubscriptions,
  withProgramIndex
} from "@better-typescript/core/engine/check"
import {
  detection,
  toRelativeFileName
} from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

import { ModuleGraphData } from "./data.js"
import { ModuleEdge, buildModuleEdges } from "./programSymbols.js"

/**
 * ModuleGraphIndex couples resolved module edges with the root used to normalize
 * their paths.
 *
 * @modelRole shared
 * @remarks It remains explicit because index construction and per-file evidence
 * lookup must use one path coordinate system. Removing it would pass parallel
 * values and risk normalizing graph edges against a different root.
 */
class ModuleGraphIndex extends Data.Class<{
  readonly edges: ReadonlyArray<ModuleEdge>
  readonly projectRoot: string
}> {}

const message =
  "Module graph evidence — this Module imports other project Modules."

const hint =
  "Architecture Explore uses resolved edges to find connected bounce paths; an import count alone is not an architectural defect."

const buildIndex = (context: ProgramContext): ModuleGraphIndex => {
  const edges = buildModuleEdges(context)

  return new ModuleGraphIndex({
    edges,
    projectRoot: context.projectRoot
  })
}

const moduleGraphElements =
  (index: ModuleGraphIndex) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    const relative = toRelativeFileName(index.projectRoot)
    const filePath = relative(context.sourceFile.fileName)

    const importedPaths = pipe(
      index.edges,
      Array.filter((edge) => edge.importerPath === filePath),
      Array.map(Struct.get("importedPath")),
      Array.dedupe
    )

    if (importedPaths.length === 0) {
      return Array.empty()
    }

    const element = detection(context)

    const node = pipe(
      Option.fromNullable(context.sourceFile.statements[0]),
      Option.getOrElse(Function.constant(context.sourceFile))
    )

    const data = new ModuleGraphData({ importedPaths })

    const reported = element({ node, message, hint, data })

    return Array.of(reported)
  }

const moduleGraphSubscriptions = Function.compose(
  moduleGraphElements,
  fileSubscriptions
)

export const moduleGraph: Check = withProgramIndex(buildIndex)(
  moduleGraphSubscriptions
)
