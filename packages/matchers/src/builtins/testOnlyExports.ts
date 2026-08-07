import * as path from "node:path"
import { Array, Result, Schema, Struct, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { isPackageProject } from "./architectureExplore/isPackageProject.js"
import { isTestSourceFile } from "./architectureExplore/isTestPath.js"
import type { ExportReferenceIndex } from "./architectureExplore/exportReferenceIndex.js"
import { usageFor } from "./architectureExplore/usageFor.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { Match } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"

import { stringArray } from "./architectureExplore/stringArraySchema.js"
import { exportReferenceFileMatcher } from "./exportReferenceFileMatcher.js"

// TestOnlyExportData is test-only call evidence because advice separates seams.
export const TestOnlyExportData = Schema.Struct({
  testPaths: stringArray,
  testCallCount: Schema.Number
})

export interface TestOnlyExportData extends Schema.Schema.Type<typeof TestOnlyExportData> {}

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

        const reported = makeNodeMatch(entry.nameNode, data)

        return Result.succeed(reported)
      })
    )
  }

export const testOnlyExports = exportReferenceFileMatcher(testOnlyExportElements)
