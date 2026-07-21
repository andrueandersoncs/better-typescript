import * as path from "node:path"
import { Array, Function, Struct, flow, pipe, Result } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { TestOnlyExportData } from "./architectureExploreData.js"
import { isPackageProject, isTestSourceFile } from "./architectureExplore/paths.js"
import { ExportReferenceIndex, usageFor } from "./architectureExplore/programSymbols.js"
import {
  evidenceMatcher,
  exportReferenceIndex
} from "./architectureExplore/architectureEvidence.js"
import { fileSubscriptions } from "@better-typescript/matchers/matcher"
import { nodeMatch, type Match, type MatchContext } from "@better-typescript/matchers/matcher/data"

const sourceBelongsToProject = (context: MatchContext) => {
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
  (context: MatchContext): ReadonlyArray<Match<TestOnlyExportData>> => {
    const isTestFile = isTestSourceFile(context.workspaceRoot)(context.sourceFile)
    const belongsToProject = sourceBelongsToProject(context)
    const isPackage = isPackageProject(context.workspaceRoot)(context.projectRoot)
    const doesNotBelongToProject = !belongsToProject
    const isOutOfScope = isTestFile || doesNotBelongToProject
    const shouldSkip = isOutOfScope || isPackage

    if (shouldSkip) {
      return Array.empty()
    }

    const isEntryInSourceFile = flow(
      Struct.get<(typeof index.entries)[number], "nameNode">("nameNode"),
      (nameNode) => nameNode.getSourceFile(),
      strictEqual(context.sourceFile)
    )

    return pipe(
      index.entries,
      Array.filter(isEntryInSourceFile),
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

        const reported = nodeMatch(entry.nameNode, data)

        return Result.succeed(reported)
      })
    )
  }

const testOnlyExportSubscriptions = Function.compose(testOnlyExportElements, fileSubscriptions)

const testOnlyExportCheck = evidenceMatcher(exportReferenceIndex)(testOnlyExportSubscriptions)

export const testOnlyExports = testOnlyExportCheck
