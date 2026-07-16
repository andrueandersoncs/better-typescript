import { Array, Function, Option, Predicate, Result, Struct, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { interfaceBurdenDataOf, moduleGraphDataOf, workspaceImportEdges } from "./evidence.js"
import { interfaceBurdenName, moduleGraphName } from "./names.js"
import { isTestPath } from "./programSymbols.js"

export const hubModuleExamples: NonEmptyRefactorExamples = fixtureRefactorExamples("hub-module")

const minimumOperations = 12
const minimumFanIn = 3
const minimumFanOut = 6

const hubAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const edges = workspaceImportEdges(elements)

  const burdens = pipe(
    elements,
    Array.filter((element) => element.name === interfaceBurdenName),
    Array.filterMap(Function.flow(interfaceBurdenDataOf, Result.fromOption(Function.constVoid))),
    Array.filter((data) =>
      pipe(
        data.workspacePath,
        Option.liftPredicate(Predicate.isString),
        Option.exists((workspacePath) => {
          const hasWorkspacePath = workspacePath !== ""
          const hasProductionPath = !isTestPath(workspacePath)
          const conditions = Array.make(hasWorkspacePath, hasProductionPath)

          return Array.every(conditions, Boolean)
        })
      )
    )
  )

  const moduleGraphs = pipe(
    elements,
    Array.filter((element) => element.name === moduleGraphName),
    Array.filterMap(Function.flow(moduleGraphDataOf, Result.fromOption(Function.constVoid)))
  )

  return Array.filterMap(burdens, (burden) => {
    const workspacePath = burden.workspacePath

    if (!Predicate.isString(workspacePath)) {
      return Result.failVoid
    }

    const operationCount = burden.operationCount

    const fanIn = pipe(
      edges,
      Array.filter((edge) => {
        const importsWorkspacePath = edge.importedPath === workspacePath
        const isProductionImport = !edge.fromTest
        const conditions = Array.make(importsWorkspacePath, isProductionImport)

        return Array.every(conditions, Boolean)
      }),
      Array.map(Struct.get("importerPath")),
      Array.dedupe
    ).length

    const fanOut = pipe(
      moduleGraphs,
      Array.findFirst((data) => data.workspacePath === workspacePath),
      Option.map((data) => data.importedWorkspacePaths.length),
      Option.getOrElse(Function.constant(0))
    )

    const operationsBelowMinimum = operationCount < minimumOperations
    const fanInBelowMinimum = fanIn < minimumFanIn
    const fanOutBelowMinimum = fanOut < minimumFanOut
    const minimumChecks = Array.make(operationsBelowMinimum, fanInBelowMinimum, fanOutBelowMinimum)
    const isBelowMinimum = Array.some(minimumChecks, Boolean)

    if (isBelowMinimum) {
      return Result.failVoid
    }

    const location = adviceLocation(workspacePath)
    const operationsItem = evidenceItem("interface-operations", operationCount)
    const fanInItem = evidenceItem("fan-in-modules", fanIn)
    const fanOutItem = evidenceItem("fan-out-modules", fanOut)
    const evidence = Array.make(operationsItem, fanInItem, fanOutItem)

    const advice = new Advice({
      location,
      level: "file",
      title: "hub module",
      remediation:
        "A hub Module hides several Modules behind one name. " +
        "Split along its consumer seams so each caller learns one smaller interface.",
      evidence,
      examples: hubModuleExamples
    })

    return Result.succeed(advice)
  })
}

export const hubModule = deriveSignals(hubAdvice)
