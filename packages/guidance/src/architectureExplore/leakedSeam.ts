import * as path from "node:path"
import { Array, Function, Option, Predicate, Result, Tuple, pipe, Struct, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { Advice, EvidenceItem } from "@better-typescript/core/engine/derive/data"
import { deriveSignals } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { makePackageExamples } from "../definePolicy.js"
import { moduleGraphDataOf, seamLeakageDataOf } from "./evidence.js"
import type {
  ModuleGraphData,
  SeamLeakageData
} from "@better-typescript/matchers/builtins/architectureExploreData"
import { moduleGraphName, seamLeakageEvidenceName } from "./names.js"
import { isTestPath } from "./pathUtils.js"

export const leakedSeamExamples = makePackageExamples("leaked-seam")

const minimumLeaks = 2

const isProductionPath = Predicate.not(isTestPath)

const directoryEdgesFromData = (
  data: ModuleGraphData
): ReadonlyArray<readonly [string, string]> => {
  if (isTestPath(data.workspacePath)) {
    return Array.empty<readonly [string, string]>()
  }

  const fromDirectory = path.posix.dirname(data.workspacePath)

  const edgeFromImport = (importedPath: string) => {
    const toDirectory = path.posix.dirname(importedPath)

    return Tuple.make(fromDirectory, toDirectory)
  }

  const isCrossDirectory = ([from, to]: readonly [string, string]) => !strictEqual(from)(to)

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
  const isSeamLeakageElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(seamLeakageEvidenceName)
  )

  const hasPath = (filePath: string) => (element: NamedDetection) =>
    strictEqual(filePath)(element.detection.location.path)

  const isInternalPath = flow(
    Struct.get<SeamLeakageData, "kind">("kind"),
    strictEqual("internal-path")
  )

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
    const location = Location.make({ path: filePath })

    const internalItem = EvidenceItem.make({
      measure: "internal-path-imports",
      count: internalCount
    })

    const sourceItem = EvidenceItem.make({ measure: "source-path-imports", count: sourceCount })
    const evidence = Array.make(internalItem, sourceItem)

    const advice = Advice.make({
      location,
      level: "file",
      title: "leaked seam",
      remediation:
        "This Module repeatedly bypasses declared interfaces through internal or package-source imports. " +
        "Route dependencies through one public seam so implementation paths remain local and replaceable.",
      evidence,
      examples: leakedSeamExamples
    })

    return Result.succeed(advice)
  })
}

const directoryPairAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const isModuleGraphElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(moduleGraphName)
  )

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
        const fromMatches = strictEqual(left)(from)
        const toMatches = strictEqual(right)(to)
        const conditions = Array.make(fromMatches, toMatches)

        return Array.every(conditions, Boolean)
      })

      const reverseCount = Array.countBy(directoryEdges, ([from, to]) => {
        const fromMatches = strictEqual(right)(from)
        const toMatches = strictEqual(left)(to)
        const conditions = Array.make(fromMatches, toMatches)

        return Array.every(conditions, Boolean)
      })

      const smallestDirectionCount = Math.min(forwardCount, reverseCount)

      if (strictEqual(0)(smallestDirectionCount)) {
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
    const location = Location.make({ path: smaller })
    const crossImportsItem = EvidenceItem.make({ measure: "cross-imports", count: crossImports })
    const evidence = Array.of(crossImportsItem)

    return Advice.make({
      location,
      level: "directory",
      title: "leaked seam",
      remediation:
        "Two directories import each other, so the seam between them leaks in both directions. " +
        "Give the shared vocabulary one home so the dependency points one way.",
      evidence,
      examples: leakedSeamExamples
    })
  })
}

const leakedSeamAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const fileAdvice = fileLeakAdvice(elements)
  const directoryAdvice = directoryPairAdvice(elements)

  return Array.appendAll(fileAdvice, directoryAdvice)
}

export const leakedSeam = deriveSignals(leakedSeamAdvice)
