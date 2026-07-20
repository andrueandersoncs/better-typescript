import { Array, Function, Option, Predicate, Result, Struct, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import { interfaceBurdenDataOf, moduleGraphDataOf, workspaceImportEdges } from "./evidence.js"
import type { InterfaceBurdenData } from "./data.js"
import { interfaceBurdenName, moduleGraphName } from "./names.js"
import { isTestPath } from "./programSymbols.js"

export const hubModuleExamples = packageExamples("hub-module")

const minimumOperations = 12
const minimumFanIn = 3
const minimumFanOut = 6

const hubAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const edges = workspaceImportEdges(elements)
  const isInterfaceBurdenElement = (element: NamedDetection) => element.name === interfaceBurdenName
  const isModuleGraphElement = (element: NamedDetection) => element.name === moduleGraphName

  const isProductionWorkspaceBurden = (data: InterfaceBurdenData) =>
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

  const burdens = pipe(
    elements,
    Array.filter(isInterfaceBurdenElement),
    Array.filterMap(Function.flow(interfaceBurdenDataOf, Result.fromOption(Function.constVoid))),
    Array.filter(isProductionWorkspaceBurden)
  )

  const moduleGraphs = pipe(
    elements,
    Array.filter(isModuleGraphElement),
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

    const location = makeAdviceLocation(workspacePath)
    const operationsItem = makeEvidenceItem("interface-operations", operationCount)
    const fanInItem = makeEvidenceItem("fan-in-modules", fanIn)
    const fanOutItem = makeEvidenceItem("fan-out-modules", fanOut)
    const evidence = Array.make(operationsItem, fanInItem, fanOutItem)
    const examples = hubModuleExamples

    const advice = Advice.make({
      location,
      level: "file",
      title: "hub module",
      remediation:
        "A hub Module hides several Modules behind one name. " +
        "Split along its consumer seams so each caller learns one smaller interface.",
      evidence,
      examples
    })

    return Result.succeed(advice)
  })
}

export const hubModule = deriveSignals(hubAdvice)
