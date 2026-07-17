import * as path from "node:path"
import { Array, Function, Option, Result, Tuple, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import { moduleGraphDataOf, seamLeakageDataOf } from "./evidence.js"
import { moduleGraphName, seamLeakageEvidenceName } from "./names.js"
import { isTestPath } from "./programSymbols.js"

export const leakedSeamExamples = packageExamples("leaked-seam")

const minimumLeaks = 2

const directoryOf: (workspacePath: string) => string = path.posix.dirname

const fileLeakAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const leaks = Array.filter(elements, (element) => element.name === seamLeakageEvidenceName)

  const paths = pipe(
    leaks,
    Array.map((element) => element.detection.location.path),
    Array.dedupe
  )

  return Array.filterMap(paths, (filePath) => {
    const atPath = Array.filter(leaks, (element) => element.detection.location.path === filePath)

    if (atPath.length < minimumLeaks) {
      return Result.failVoid
    }

    const internalCount = pipe(
      atPath,
      Array.filterMap(Function.flow(seamLeakageDataOf, Result.fromOption(Function.constVoid))),
      Array.countBy((data) => data.kind === "internal-path")
    )

    const sourceCount = atPath.length - internalCount
    const location = adviceLocation(filePath)
    const internalItem = evidenceItem("internal-path-imports", internalCount)
    const sourceItem = evidenceItem("source-path-imports", sourceCount)
    const evidence = Array.make(internalItem, sourceItem)
    const examples = leakedSeamExamples

    const advice = new Advice({
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
  const graphElements = Array.filter(elements, (element) => element.name === moduleGraphName)

  const directoryEdges = Array.flatMap(graphElements, (element) =>
    pipe(
      moduleGraphDataOf(element),
      Option.map((data) => {
        if (isTestPath(data.workspacePath)) {
          return Array.empty<readonly [string, string]>()
        }

        const fromDirectory = directoryOf(data.workspacePath)

        return pipe(
          data.importedWorkspacePaths,
          Array.filter((importedPath) => !isTestPath(importedPath)),
          Array.map((importedPath) => {
            const importedDirectory = directoryOf(importedPath)

            return Tuple.make(fromDirectory, importedDirectory)
          }),
          Array.filter(([from, to]) => from !== to)
        )
      }),
      Option.getOrElse(Array.empty)
    )
  )

  const directories = pipe(
    directoryEdges,
    Array.flatMap(([from, to]) => Array.make(from, to)),
    Array.dedupe
  )

  const pairs = Array.flatMap(directories, (left) =>
    pipe(
      directories,
      Array.filter((right) => left < right),
      Array.filterMap((right) => {
        const forwardCount = Array.countBy(directoryEdges, ([from, to]) => {
          const fromMatches = from === left
          const toMatches = to === right
          const conditions = Array.make(fromMatches, toMatches)

          return Array.every(conditions, Boolean)
        })

        const reverseCount = Array.countBy(directoryEdges, ([from, to]) => {
          const fromMatches = from === right
          const toMatches = to === left
          const conditions = Array.make(fromMatches, toMatches)

          return Array.every(conditions, Boolean)
        })

        const smallestDirectionCount = Math.min(forwardCount, reverseCount)

        if (smallestDirectionCount === 0) {
          return Result.failVoid
        }

        const crossImports = forwardCount + reverseCount
        const pair = Tuple.make(left, right, crossImports)

        return Result.succeed(pair)
      })
    )
  )

  return Array.map(pairs, ([left, right, crossImports]) => {
    const smaller = left < right ? left : right
    const location = adviceLocation(smaller)
    const crossImportsItem = evidenceItem("cross-imports", crossImports)
    const evidence = Array.of(crossImportsItem)
    const examples = leakedSeamExamples

    return new Advice({
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
