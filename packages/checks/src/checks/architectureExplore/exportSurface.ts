import { Array, Function, Option, pipe } from "effect"
import { withProgramIndex } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { fileSubscriptions, detection } from "@better-typescript/core/engine/check"

import { ExportSurfaceData, ExportedSymbolUsage } from "./data.js"
import {
  ExportSymbolIndex,
  buildExportSymbolIndex,
  isTestSourceFile,
  symbolUsageFor,
  toWorkspacePath
} from "./programSymbols.js"

const message =
  "Export surface evidence — this Module publishes symbols referenced outside the home file."

const hint =
  "Reference and call counts exclude the declaring file so deletion tests can weigh external consumers only."

const exportSurfaceElements =
  (index: ExportSymbolIndex) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    if (isTestSourceFile(context.workspaceRoot)(context.sourceFile)) {
      return Array.empty()
    }

    const usageOf = symbolUsageFor(index)

    const symbols = pipe(
      index.entries,
      Array.filter((entry) => entry.nameNode.getSourceFile() === context.sourceFile),
      Array.map((entry) => {
        const usage = usageOf(entry)
        const referencingFileCount = usage.productionPaths.length + usage.testPaths.length
        const referencingTestFileCount = usage.testPaths.length
        const callCount = usage.productionCallCount + usage.testCallCount

        return new ExportedSymbolUsage({
          name: entry.nameNode.text,
          kind: entry.kind,
          referencingFileCount,
          referencingTestFileCount,
          callCount
        })
      })
    )

    if (symbols.length === 0) {
      return Array.empty()
    }

    const relative = toRelativeFileName(context.projectRoot)
    const workspaceRelative = toWorkspacePath(context.projectRoot, context.workspaceRoot)
    const projectPath = relative(context.sourceFile.fileName)
    const workspacePath = workspaceRelative(projectPath)
    const element = detection(context)

    const node = pipe(
      Option.fromNullishOr(context.sourceFile.statements[0]),
      Option.getOrElse(Function.constant(context.sourceFile))
    )

    const data = new ExportSurfaceData({
      workspacePath,
      symbols
    })

    const reported = element({ node, message, hint, data })
    return Array.of(reported)
  }

const exportSurfaceSubscriptions = Function.compose(exportSurfaceElements, fileSubscriptions)

export const exportSurface: Check = withProgramIndex(buildExportSymbolIndex)(
  exportSurfaceSubscriptions
)
