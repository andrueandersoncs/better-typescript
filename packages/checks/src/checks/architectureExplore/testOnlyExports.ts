import * as path from "node:path"
import { Array, Function, pipe, Result } from "effect"
import { fileSubscriptions, makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

import type { Detection } from "@better-typescript/core/engine/location/data"

import { TestOnlyExportData } from "./data.js"
import {
  ExportReferenceIndex,
  isPackageProject,
  isTestSourceFile,
  usageFor
} from "./programSymbols.js"
import { evidenceCheck, exportReferenceIndex } from "./architectureEvidence.js"
import { makeSilentCheck } from "../../defineCheck.js"
import { testOnlyExportsName } from "./names.js"

const message =
  "Test-only export evidence — production exposes this callable only so tests can reach implementation."

const hint =
  "Test through the same public interface as production callers, then make this internal helper private."

const sourceBelongsToProject = (context: CheckContext) => {
  const sourcePath = path.resolve(context.projectRoot, context.sourceFile.fileName)
  const relativePath = path.relative(context.projectRoot, sourcePath)
  const isNotParent = relativePath !== ".."
  const isNotOutside = !relativePath.startsWith(`..${path.sep}`)
  const isNotAbsolute = !path.isAbsolute(relativePath)
  const isInsideProject = isNotParent && isNotOutside

  return isInsideProject && isNotAbsolute
}

const testOnlyExportElements =
  (index: ExportReferenceIndex) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    const isTestFile = isTestSourceFile(context.workspaceRoot)(context.sourceFile)
    const belongsToProject = sourceBelongsToProject(context)
    const isPackage = isPackageProject(context.workspaceRoot)(context.projectRoot)
    const doesNotBelongToProject = !belongsToProject
    const isOutOfScope = isTestFile || doesNotBelongToProject
    const shouldSkip = isOutOfScope || isPackage

    if (shouldSkip) {
      return Array.empty()
    }

    const element = makeDetection(context)

    return pipe(
      index.entries,
      Array.filter((entry) => entry.nameNode.getSourceFile() === context.sourceFile),
      Array.filterMap((entry) => {
        const usage = usageFor(index)(entry)
        const hasTestUse = usage.testPaths.length > 0
        const hasProductionUse = usage.productionPaths.length > 0
        const hasNoProductionUse = !hasProductionUse
        const isTestOnly = hasTestUse && hasNoProductionUse

        if (!isTestOnly) {
          return Result.failVoid
        }

        const data = TestOnlyExportData.make({
          testPaths: usage.testPaths,
          testCallCount: usage.testCallCount
        })

        const reported = element({
          node: entry.nameNode,
          message,
          hint,
          data
        })

        return Result.succeed(reported)
      })
    )
  }

const testOnlyExportSubscriptions = Function.compose(testOnlyExportElements, fileSubscriptions)

const testOnlyExportCheck = evidenceCheck(exportReferenceIndex)(testOnlyExportSubscriptions)

export const testOnlyExports = makeSilentCheck(testOnlyExportsName, testOnlyExportCheck)
