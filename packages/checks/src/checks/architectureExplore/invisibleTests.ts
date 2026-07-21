import { Array, Function, Result, Struct, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { exportSurfaceDataOf, importUsageDataOf, moduleGraphDataOf } from "./evidence.js"
import { exportSurfaceName, importUsageName, moduleGraphName } from "./names.js"
import { isTestPath } from "./programSymbols.js"

const invisibleAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const isModuleGraphElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(moduleGraphName)
  )

  const isImportUsageElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(importUsageName)
  )

  const isExportSurfaceElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(exportSurfaceName)
  )

  const moduleGraphPaths = pipe(
    elements,
    Array.filter(isModuleGraphElement),
    Array.filterMap(Function.flow(moduleGraphDataOf, Result.fromOption(Function.constVoid))),
    Array.flatMap((data) => {
      const workspacePath = Array.of(data.workspacePath)

      return Array.appendAll(workspacePath, data.importedWorkspacePaths)
    })
  )

  const importUsagePaths = pipe(
    elements,
    Array.filter(isImportUsageElement),
    Array.filterMap(Function.flow(importUsageDataOf, Result.fromOption(Function.constVoid))),
    Array.map(Struct.get("importerWorkspacePath"))
  )

  const exportSurfacePaths = pipe(
    elements,
    Array.filter(isExportSurfaceElement),
    Array.filterMap(Function.flow(exportSurfaceDataOf, Result.fromOption(Function.constVoid))),
    Array.map(Struct.get("workspacePath"))
  )

  const paths = pipe(
    moduleGraphPaths,
    Array.appendAll(importUsagePaths),
    Array.appendAll(exportSurfacePaths),
    Array.filter((filePath) => filePath !== ""),
    Array.dedupe
  )

  const hasNoPaths = strictEqual(0)(paths.length)
  const hasTestPath = Array.some(paths, isTestPath)
  const skipConditions = Array.make(hasNoPaths, hasTestPath)
  const shouldSkip = Array.some(skipConditions, Boolean)

  if (shouldSkip) {
    return Array.empty()
  }

  const location = makeAdviceLocation(".")
  const analyzedItem = makeEvidenceItem("analyzed-modules", paths.length)
  const evidence = Array.of(analyzedItem)

  const advice = Advice.make({
    location,
    level: "project",
    title: "invisible tests",
    remediation:
      "The analysis saw no test files, so test-aware advice is disabled. " +
      "Reference the test project from the workspace root tsconfig (or include tests in a project) because caller evidence lives there.",
    evidence
  })

  return Array.of(advice)
}

export const invisibleTests = deriveSignals(invisibleAdvice)
