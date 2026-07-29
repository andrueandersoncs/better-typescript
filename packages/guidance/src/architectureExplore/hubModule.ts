import { Array, Function, Option, Predicate, Result, Struct, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { Advice, EvidenceItem } from "@better-typescript/core/engine/derive/data"
import { deriveSignals } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { Location } from "@better-typescript/core/engine/location/data"
import { makePackageExamples } from "../definePolicy.js"
import { interfaceBurdenDataOf, moduleGraphDataOf, workspaceImportEdges } from "./evidence.js"
import type { InterfaceBurdenData } from "@better-typescript/matchers/builtins/architectureExploreData"
import { interfaceBurdenName, moduleGraphName } from "./names.js"
import { isTestPath } from "./pathUtils.js"

export const hubModuleExamples = makePackageExamples("hub-module")

const minimumOperations = 12
const minimumFanIn = 3
const minimumFanOut = 6

const hubAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const edges = workspaceImportEdges(elements)

  const isInterfaceBurdenElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(interfaceBurdenName)
  )

  const isModuleGraphElement = flow(
    Struct.get<NamedDetection, "name">("name"),
    strictEqual(moduleGraphName)
  )

  const isProductionWorkspaceBurden = (data: InterfaceBurdenData) =>
    pipe(
      data.workspacePath,
      Option.liftPredicate(Predicate.isString),
      Option.exists((workspacePath) => {
        const hasWorkspacePath = !strictEqual("")(workspacePath)
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
    if (!Predicate.isString(burden.workspacePath)) {
      return Result.failVoid
    }

    const fanIn = pipe(
      edges,
      Array.filter((edge) => {
        const importsWorkspacePath = strictEqual(burden.workspacePath)(edge.importedPath)
        const isProductionImport = !edge.fromTest
        const conditions = Array.make(importsWorkspacePath, isProductionImport)

        return Array.every(conditions, Boolean)
      }),
      Array.map(Struct.get("importerPath")),
      Array.dedupe
    ).length

    const matchesWorkspacePath = flow(
      Struct.get<(typeof moduleGraphs)[number], "workspacePath">("workspacePath"),
      strictEqual(burden.workspacePath)
    )

    const fanOut = pipe(
      moduleGraphs,
      Array.findFirst(matchesWorkspacePath),
      Option.map((data) => data.importedWorkspacePaths.length),
      Option.getOrElse(Function.constant(0))
    )

    const operationsBelowMinimum = burden.operationCount < minimumOperations
    const fanInBelowMinimum = fanIn < minimumFanIn
    const fanOutBelowMinimum = fanOut < minimumFanOut
    const minimumChecks = Array.make(operationsBelowMinimum, fanInBelowMinimum, fanOutBelowMinimum)
    const isBelowMinimum = Array.some(minimumChecks, Boolean)

    if (isBelowMinimum) {
      return Result.failVoid
    }

    const location = Location.make({ path: burden.workspacePath })

    const operationsItem = EvidenceItem.make({
      measure: "interface-operations",
      count: burden.operationCount
    })

    const fanInItem = EvidenceItem.make({ measure: "fan-in-modules", count: fanIn })
    const fanOutItem = EvidenceItem.make({ measure: "fan-out-modules", count: fanOut })
    const evidence = Array.make(operationsItem, fanInItem, fanOutItem)

    const advice = Advice.make({
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
