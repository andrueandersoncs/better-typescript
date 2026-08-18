import { Array, Option, Schema, Struct, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { toRelativeFileName } from "../support/paths.js"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { isPackageProject } from "./architectureExplore/isPackageProject.js"
import { isTestSourceFile } from "./architectureExplore/isTestPath.js"
import { toWorkspacePath } from "./architectureExplore/toWorkspacePath.js"
import { ExportedSymbolEntry } from "./architectureExplore/exportedSymbolEntry.js"
import { ExportSymbolIndex } from "./architectureExplore/exportSymbolIndex.js"
import { ExportedSymbolUsage } from "./architectureExplore/exportedSymbolUsage.js"
import { usageForSymbol } from "./architectureExplore/usageForSymbol.js"
import { architectureEvidence } from "./architectureExplore/architectureEvidence.js"
import { FileTarget } from "../matcher/fileTarget.js"
import { Match } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { programIndexedFileMatcher } from "./programIndexedFileMatcher.js"

export const makeFileMatch = <Fact>(sourceFile: ts.SourceFile, fact: Fact) => {
  const target = new FileTarget({ sourceFile })
  const match = new Match({ target, fact })
  return match
}

const exportedSymbolUsageArray = Schema.Array(ExportedSymbolUsage)

// ExportSurfaceData is one file export inventory because workspace advice joins import usage.
export const ExportSurfaceData = Schema.Struct({
  workspacePath: Schema.String,
  symbols: exportedSymbolUsageArray
})

export interface ExportSurfaceData extends Schema.Schema.Type<typeof ExportSurfaceData> {}

export const buildExportSymbolIndex = (context: ProgramContext) =>
  architectureEvidence(context).exportSymbolIndex

const exportSurfaceElements =
  (index: ExportSymbolIndex) =>
  (context: MatchContext): ReadonlyArray<Match<ExportSurfaceData>> => {
    const isTestFile = isTestSourceFile(context.workspaceRoot)(context.sourceFile)
    const isPackage = isPackageProject(context.workspaceRoot)(context.projectRoot)
    const shouldSkip = isTestFile || isPackage
    if (shouldSkip) {
      return Array.empty()
    }

    const usageOf = flow(
      Struct.get<ExportedSymbolEntry, "symbol">("symbol"),
      usageForSymbol(index.usages)
    )

    const isEntryInSourceFile = flow(
      Struct.get<(typeof index.entries)[number], "nameNode">("nameNode"),
      (nameNode: ts.Node) => nameNode.getSourceFile(),
      strictEqual(context.sourceFile)
    )

    const symbols = pipe(
      index.entries,
      Array.filter(isEntryInSourceFile),
      Array.map((entry) => {
        const usage = usageOf(entry)
        const referencingFileCount = usage.productionPaths.length + usage.testPaths.length
        const callCount = usage.productionCallCount + usage.testCallCount
        return ExportedSymbolUsage.make({
          name: entry.nameNode.text,
          kind: entry.kind,
          referencingFileCount,
          referencingTestFileCount: usage.testPaths.length,
          callCount
        })
      })
    )

    if (strictEqual(0)(symbols.length)) {
      return Array.empty()
    }

    const projectPath = toRelativeFileName(context.projectRoot)(context.sourceFile.fileName)
    const workspacePath = toWorkspacePath(context.projectRoot, context.workspaceRoot)(projectPath)
    const fact = ExportSurfaceData.make({ workspacePath, symbols })
    const reported = makeFileMatch(context.sourceFile, fact)
    return Array.of(reported)
  }

export const exportSurface =
  programIndexedFileMatcher(buildExportSymbolIndex)(exportSurfaceElements)
