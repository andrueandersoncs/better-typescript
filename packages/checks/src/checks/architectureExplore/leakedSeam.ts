import * as path from "node:path"
import { Array, Function, Option, Predicate, Result, Tuple, pipe } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import { moduleGraphDataOf, seamLeakageDataOf } from "./evidence.js"
import type { ModuleGraphData, SeamLeakageData } from "./data.js"
import { moduleGraphName, seamLeakageEvidenceName } from "./names.js"
import { isTestPath } from "./programSymbols.js"

export const leakedSeamExamples = packageExamples("leaked-seam")

const minimumLeaks = 2

const directoryOf: (workspacePath: string) => string = path.posix.dirname

const isProductionPath = Predicate.not(isTestPath)

const directoryEdgesFromData = (
  data: ModuleGraphData
): ReadonlyArray<readonly [string, string]> => {
  if (isTestPath(data.workspacePath)) {
    return Array.empty<readonly [string, string]>()
  }

  const fromDirectory = directoryOf(data.workspacePath)

  const edgeFromImport = (importedPath: string) => {
    const toDirectory = directoryOf(importedPath)

    return Tuple.make(fromDirectory, toDirectory)
  }

  const isCrossDirectory = ([from, to]: readonly [string, string]) => from !== to

  return pipe(
    data.importedWorkspacePaths,
    Array.filter(isProductionPath),
    Array.map(edgeFromImport),
    Array.filter(isCrossDirectory)
  )
}

const directoryEdgesFromElement = (element: NamedDetection) =>
  pipe(
    moduleGraphDataOf(element),
    Option.map(directoryEdgesFromData),
    Option.getOrElse(Array.empty)
  )

const fileLeakAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const isSeamLeakageElement = (element: NamedDetection) =>
    strictEqual(element.name, seamLeakageEvidenceName)

  const hasPath = (filePath: string) => (element: NamedDetection) =>
    strictEqual(element.detection.location.path, filePath)

  const isInternalPath = (data: SeamLeakageData) => strictEqual(data.kind, "internal-path")
  const leaks = Array.filter(elements, isSeamLeakageElement)

  const paths = pipe(
    leaks,
    Array.map((element) => element.detection.location.path),
    Array.dedupe
  )

  return Array.filterMap(paths, (filePath) => {
    const atPath = Array.filter(leaks, hasPath(filePath))

    if (atPath.length < minimumLeaks) {
      return Result.failVoid
    }

    const internalCount = pipe(
      atPath,
      Array.filterMap(Function.flow(seamLeakageDataOf, Result.fromOption(Function.constVoid))),
      Array.countBy(isInternalPath)
    )

    const sourceCount = atPath.length - internalCount
    const location = makeAdviceLocation(filePath)
    const internalItem = makeEvidenceItem("internal-path-imports", internalCount)
    const sourceItem = makeEvidenceItem("source-path-imports", sourceCount)
    const evidence = Array.make(internalItem, sourceItem)
    const examples = leakedSeamExamples

    const advice = Advice.make({
      location,
      level: "file",
      title: "leaked seam",
      remediation:
        "This Module repeatedly bypasses declared interfaces through internal or package-source imports. " +
        "Route dependencies through one public seam so implementation paths remain local and replaceable.",
      evidence,
      examples
    })

    return Result.succeed(advice)
  })
}

const directoryPairAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const isModuleGraphElement = (element: NamedDetection) =>
    strictEqual(element.name, moduleGraphName)

  const graphElements = Array.filter(elements, isModuleGraphElement)
  const directoryEdges = Array.flatMap(graphElements, directoryEdgesFromElement)

  const directories = pipe(
    directoryEdges,
    Array.flatMap(([from, to]) => Array.make(from, to)),
    Array.dedupe
  )

  const pairs = Array.flatMap(directories, (left) => {
    const isGreaterThanLeft = (right: string) => left < right

    const pairWithLeft = (right: string) => {
      const forwardCount = Array.countBy(directoryEdges, ([from, to]) => {
        const fromMatches = strictEqual(from, left)
        const toMatches = strictEqual(to, right)
        const conditions = Array.make(fromMatches, toMatches)

        return Array.every(conditions, Boolean)
      })

      const reverseCount = Array.countBy(directoryEdges, ([from, to]) => {
        const fromMatches = strictEqual(from, right)
        const toMatches = strictEqual(to, left)
        const conditions = Array.make(fromMatches, toMatches)

        return Array.every(conditions, Boolean)
      })

      const smallestDirectionCount = Math.min(forwardCount, reverseCount)

      if (strictEqual(smallestDirectionCount, 0)) {
        return Result.failVoid
      }

      const crossImports = forwardCount + reverseCount
      const pair = Tuple.make(left, right, crossImports)

      return Result.succeed(pair)
    }

    return pipe(directories, Array.filter(isGreaterThanLeft), Array.filterMap(pairWithLeft))
  })

  return Array.map(pairs, ([left, right, crossImports]) => {
    const smaller = left < right ? left : right
    const location = makeAdviceLocation(smaller)
    const crossImportsItem = makeEvidenceItem("cross-imports", crossImports)
    const evidence = Array.of(crossImportsItem)
    const examples = leakedSeamExamples

    return Advice.make({
      location,
      level: "directory",
      title: "leaked seam",
      remediation:
        "Two directories import each other, so the seam between them leaks in both directions. " +
        "Give the shared vocabulary one home so the dependency points one way.",
      evidence,
      examples
    })
  })
}

const leakedSeamAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const fileAdvice = fileLeakAdvice(elements)
  const directoryAdvice = directoryPairAdvice(elements)

  return Array.appendAll(fileAdvice, directoryAdvice)
}

export const leakedSeam = deriveSignals(leakedSeamAdvice)
