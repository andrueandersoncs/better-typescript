import { Array, Function, Option, pipe } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { withProgramIndex } from "../../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

import type { Detection } from "@better-typescript/core/engine/location/data"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { fileSubscriptions, makeDetection } from "@better-typescript/core/engine/check"

import { ExportSurfaceData, ExportedSymbolUsage } from "./data.js"
import {
  ExportSymbolIndex,
  buildExportSymbolIndex,
  isPackageProject,
  isTestSourceFile,
  symbolUsageFor,
  toWorkspacePath
} from "./programSymbols.js"
import { makeSilentCheck } from "../../defineCheck.js"
import { exportSurfaceName } from "./names.js"

const message =
  "Export surface evidence — this Module publishes symbols referenced outside the home file."

const hint =
  "Reference and call counts exclude the declaring file so deletion tests can weigh external consumers only."

const exportSurfaceElements =
  (index: ExportSymbolIndex) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    const isTestFile = isTestSourceFile(context.workspaceRoot)(context.sourceFile)
    const isPackage = isPackageProject(context.workspaceRoot)(context.projectRoot)
    const shouldSkip = isTestFile || isPackage

    if (shouldSkip) {
      return Array.empty()
    }

    const usageOf = symbolUsageFor(index)

    const isEntryInSourceFile = (entry: (typeof index.entries)[number]) => {
      const entrySourceFile = entry.nameNode.getSourceFile()

      return strictEqual(entrySourceFile, context.sourceFile)
    }

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

    if (strictEqual(symbols.length, 0)) {
      return Array.empty()
    }

    const relative = toRelativeFileName(context.projectRoot)
    const workspaceRelative = toWorkspacePath(context.projectRoot, context.workspaceRoot)
    const projectPath = relative(context.sourceFile.fileName)
    const workspacePath = workspaceRelative(projectPath)
    const element = makeDetection(context)

    const node = pipe(
      Option.fromNullishOr(context.sourceFile.statements[0]),
      Option.getOrElse(Function.constant(context.sourceFile))
    )

    const data = ExportSurfaceData.make({
      workspacePath,
      symbols
    })

    const reported = element({ node, message, hint, data })
    return Array.of(reported)
  }

const exportSurfaceSubscriptions = Function.compose(exportSurfaceElements, fileSubscriptions)

const exportSurfaceCheck = withProgramIndex(buildExportSymbolIndex)(exportSurfaceSubscriptions)

export const exportSurface = makeSilentCheck(exportSurfaceName, exportSurfaceCheck)
