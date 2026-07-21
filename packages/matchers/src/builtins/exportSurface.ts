import { Array, Function, Struct, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { toRelativeFileName } from "../support/paths.js"
import { ExportSurfaceData, ExportedSymbolUsage } from "./architectureExploreData.js"
import { isPackageProject, isTestSourceFile, toWorkspacePath } from "./architectureExplore/paths.js"
import {
  ExportSymbolIndex,
  buildExportSymbolIndex,
  symbolUsageFor
} from "./architectureExplore/programSymbols.js"
import { fileSubscriptions, withProgramMatcherIndex } from "@better-typescript/matchers/matcher"
import { fileMatch, type Match, type MatchContext } from "@better-typescript/matchers/matcher/data"

const exportSurfaceElements =
  (index: ExportSymbolIndex) =>
  (context: MatchContext): ReadonlyArray<Match<ExportSurfaceData>> => {
    const isTestFile = isTestSourceFile(context.workspaceRoot)(context.sourceFile)
    const isPackage = isPackageProject(context.workspaceRoot)(context.projectRoot)
    const shouldSkip = isTestFile || isPackage

    if (shouldSkip) {
      return Array.empty()
    }

    const usageOf = symbolUsageFor(index)

    const isEntryInSourceFile = flow(
      Struct.get<(typeof index.entries)[number], "nameNode">("nameNode"),
      (nameNode) => nameNode.getSourceFile(),
      strictEqual(context.sourceFile)
    )

    const symbols = pipe(
      index.entries,
      Array.filter(isEntryInSourceFile),
      Array.map((entry) => {
        const usage = usageOf(entry)
        const referencingFileCount = usage.productionPaths.length + usage.testPaths.length
        const referencingTestFileCount = usage.testPaths.length
        const callCount = usage.productionCallCount + usage.testCallCount

        return ExportedSymbolUsage.make({
          name: entry.nameNode.text,
          kind: entry.kind,
          referencingFileCount,
          referencingTestFileCount,
          callCount
        })
      })
    )

    if (strictEqual(0)(symbols.length)) {
      return Array.empty()
    }

    const relative = toRelativeFileName(context.projectRoot)
    const workspaceRelative = toWorkspacePath(context.projectRoot, context.workspaceRoot)
    const projectPath = relative(context.sourceFile.fileName)
    const workspacePath = workspaceRelative(projectPath)
    const fact = ExportSurfaceData.make({ workspacePath, symbols })
    const reported = fileMatch(context.sourceFile, fact)
    return Array.of(reported)
  }

const exportSurfaceSubscriptions = Function.compose(exportSurfaceElements, fileSubscriptions)

const exportSurfaceCheck = withProgramMatcherIndex(buildExportSymbolIndex)(
  exportSurfaceSubscriptions
)

export const exportSurface = exportSurfaceCheck
