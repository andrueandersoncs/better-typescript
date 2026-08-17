import { architectureExploreIsTestPath } from "./architectureExploreIsTestPath.js"
import { Array, Data, Function, Option, Result, Schema, Struct, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { deriveSignals } from "@better-typescript/core/engine/derive/deriveSignals"
import { NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { makePackageExamples } from "../makePackageExamples.js"
import { ModuleGraphData } from "@better-typescript/matchers/builtins/moduleGraph"
import { ContextTagSeamData } from "@better-typescript/matchers/builtins/contextTagSeams"
import { ExportSurfaceData } from "@better-typescript/matchers/builtins/exportSurface"
import { ImportUsageData } from "@better-typescript/matchers/builtins/importUsage"
import { architectureExploreCorePolicies } from "../preset/architectureExploreCorePolicies.js"
import { architectureExploreOopPolicies } from "../preset/architectureExploreOopPolicies.js"
import { contextTagSeams as contextTagSeamsPolicy } from "../preset/contextTagSeams.js"
import { moduleScopeEffects as moduleScopeEffectsPolicy } from "../preset/moduleScopeEffects.js"

const makeArchitectureExploreTestabilityAdvisers = () => {
  const [, , moduleGraphPolicy, , , importUsagePolicy, , exportSurfacePolicy] =
    architectureExploreCorePolicies

  const [externalDependencyConstructionPolicy, singleAdapterSeamsPolicy] =
    architectureExploreOopPolicies

  const deriveCheckedData = <A>(
    guard: (input: unknown) => input is A,
    element: NamedDetection
  ): Option.Option<A> =>
    guard(element.detection.data) ? Option.some(element.detection.data) : Option.none<A>()

  const deriveModuleGraphDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ModuleGraphData), element)

  const importUsageDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ImportUsageData), element)

  const exportSurfaceDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ExportSurfaceData), element)

  const contextTagSeamDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ContextTagSeamData), element)

  const hardToTestHotspotExamples = makePackageExamples("hard-to-test-hotspot")
  const minimumConstructions = 2

  const constructionNames = Array.make(
    externalDependencyConstructionPolicy.name,
    moduleScopeEffectsPolicy.name
  )

  const hardToTestAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const isConstructionName = (name: string) => Array.contains(constructionNames, name)
    const isConstructionElement = (element: NamedDetection) => isConstructionName(element.name)

    const detectionPath = flow(
      Struct.get<NamedDetection, "detection">("detection"),
      Struct.get<NamedDetection["detection"], "location">("location"),
      Struct.get<NamedDetection["detection"]["location"], "path">("path")
    )

    const constructions = Array.filter(elements, isConstructionElement)
    const paths = pipe(constructions, Array.map(detectionPath), Array.dedupe)

    const hasPath = (filePath: string) =>
      flow(
        Struct.get<NamedDetection, "detection">("detection"),
        Struct.get<NamedDetection["detection"], "location">("location"),
        Struct.get<NamedDetection["detection"]["location"], "path">("path"),
        strictEqual(filePath)
      )

    const hasMinimumConstructions = (filePath: string) =>
      Array.countBy(constructions, hasPath(filePath)) >= minimumConstructions

    return pipe(
      paths,
      Array.filter(hasMinimumConstructions),
      Array.map((filePath) => {
        const atPath = Array.filter(constructions, hasPath(filePath))

        const isExternalDependencyConstruction = flow(
          Struct.get<NamedDetection, "name">("name"),
          strictEqual(externalDependencyConstructionPolicy.name)
        )

        const isModuleScopeEffects = flow(
          Struct.get<NamedDetection, "name">("name"),
          strictEqual(moduleScopeEffectsPolicy.name)
        )

        const constructorCount = Array.countBy(atPath, isExternalDependencyConstruction)
        const moduleScopeCount = Array.countBy(atPath, isModuleScopeEffects)
        const location = Location.make({ path: filePath })

        const constructionItem = EvidenceItem.make({
          measure: externalDependencyConstructionPolicy.name,
          count: constructorCount
        })

        const moduleScopeItem = EvidenceItem.make({
          measure: moduleScopeEffectsPolicy.name,
          count: moduleScopeCount
        })

        const evidence = Array.make(constructionItem, moduleScopeItem)

        return Advice.make({
          location,
          level: "file",
          title: "hard-to-test hotspot",
          remediation:
            "External collaborator construction is concentrated inside behaviour. Classify the dependency first, construct production adapters " +
            "at the composition root, and inject a port only when a real test adapter supplies the second implementation.",
          evidence,
          examples: hardToTestHotspotExamples
        })
      })
    )
  }

  const hardToTestHotspot = deriveSignals(hardToTestAdvice)
  const hypotheticalSeamExamples = makePackageExamples("hypothetical-seam")

  const baseRemediation =
    "These injected behavioural interfaces have one production adapter and no test adapter. " +
    "Remove the speculative port and keep the seam internal until a second implementation actually varies across it."

  const deadRemediation =
    " A seam with no consumers is dead surface; delete the service until a caller and a second adapter exist."

  const isHypotheticalContext = (element: NamedDetection) =>
    pipe(
      contextTagSeamDataOf(element),
      Option.exists((data: ContextTagSeamData) => {
        const hasAtMostOneProductionAdapter = data.productionAdapterCount <= 1
        const hasNoTestAdapter = strictEqual(0)(data.testAdapterCount)
        const conditions = Array.make(hasAtMostOneProductionAdapter, hasNoTestAdapter)

        return Array.every(conditions, Boolean)
      })
    )

  const hypotheticalSeamAdvice = (
    elements: ReadonlyArray<NamedDetection>
  ): ReadonlyArray<Advice> => {
    const isSingleAdapterSeamsElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(singleAdapterSeamsPolicy.name)
    )

    const isContextTagSeamsElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(contextTagSeamsPolicy.name)
    )

    const hasPath = (filePath: string) =>
      flow(
        Struct.get<NamedDetection, "detection">("detection"),
        Struct.get<NamedDetection["detection"], "location">("location"),
        Struct.get<NamedDetection["detection"]["location"], "path">("path"),
        strictEqual(filePath)
      )

    const hasNoConsumers = flow(
      Struct.get<ContextTagSeamData, "consumerCount">("consumerCount"),
      strictEqual(0)
    )

    const singleAdapterSeams = Array.filter(elements, isSingleAdapterSeamsElement)

    const contextSeams = pipe(
      elements,
      Array.filter(isContextTagSeamsElement),
      Array.filter(isHypotheticalContext)
    )

    const seams = Array.appendAll(singleAdapterSeams, contextSeams)

    const paths = pipe(
      seams,
      Array.map(
        flow(
          Struct.get<NamedDetection, "detection">("detection"),
          Struct.get<NamedDetection["detection"], "location">("location"),
          Struct.get<NamedDetection["detection"]["location"], "path">("path")
        )
      ),
      Array.dedupe
    )

    return Array.map(paths, (filePath) => {
      const atPath = Array.filter(seams, hasPath(filePath))

      const deadCount = pipe(
        atPath,
        Array.filter(isContextTagSeamsElement),
        Array.filterMap(Function.flow(contextTagSeamDataOf, Result.fromOption(Function.constVoid))),
        Array.countBy(hasNoConsumers)
      )

      const location = Location.make({ path: filePath })

      const seamItem = EvidenceItem.make({
        measure: singleAdapterSeamsPolicy.name,
        count: atPath.length
      })

      const evidence =
        deadCount > 0
          ? pipe(
              EvidenceItem.make({ measure: "dead-seams", count: deadCount }),
              Array.of,
              Array.prepend(seamItem)
            )
          : Array.of(seamItem)

      const remediation = deadCount > 0 ? baseRemediation + deadRemediation : baseRemediation

      return Advice.make({
        location,
        level: "file",
        title: "hypothetical seam",
        remediation,
        evidence,
        examples: hypotheticalSeamExamples
      })
    })
  }

  const hypotheticalSeam = deriveSignals(hypotheticalSeamAdvice)

  // invisibleTests: collocated because exclusive ownership keeps one Semantic Module.

  const invisibleAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const isModuleGraphElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(moduleGraphPolicy.name)
    )

    const isImportUsageElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(importUsagePolicy.name)
    )

    const isExportSurfaceElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(exportSurfacePolicy.name)
    )

    const moduleGraphPaths = pipe(
      elements,
      Array.filter(isModuleGraphElement),
      Array.filterMap(
        Function.flow(deriveModuleGraphDataOf, Result.fromOption(Function.constVoid))
      ),
      Array.flatMap((data: ModuleGraphData) => {
        const workspacePath = Array.of(data.workspacePath)

        return Array.appendAll(workspacePath, data.importedWorkspacePaths)
      })
    )

    const importUsagePaths = pipe(
      elements,
      Array.filter(isImportUsageElement),
      Array.filterMap(Function.flow(importUsageDataOf, Result.fromOption(Function.constVoid))),
      Array.map(Struct.get<ImportUsageData, "importerWorkspacePath">("importerWorkspacePath"))
    )

    const exportSurfacePaths = pipe(
      elements,
      Array.filter(isExportSurfaceElement),
      Array.filterMap(Function.flow(exportSurfaceDataOf, Result.fromOption(Function.constVoid))),
      Array.map(Struct.get<ExportSurfaceData, "workspacePath">("workspacePath"))
    )

    const isEmptyPath = strictEqual("")
    const isPresentPath = (filePath: string) => !isEmptyPath(filePath)

    const paths = pipe(
      moduleGraphPaths,
      Array.appendAll(importUsagePaths),
      Array.appendAll(exportSurfacePaths),
      Array.filter(isPresentPath),
      Array.dedupe
    )

    const hasNoPaths = strictEqual(0)(paths.length)
    const hasTestPath = Array.some(paths, architectureExploreIsTestPath)
    const skipConditions = Array.make(hasNoPaths, hasTestPath)
    const shouldSkip = Array.some(skipConditions, Boolean)

    if (shouldSkip) {
      return Array.empty()
    }

    const location = Location.make({ path: "." })
    const analyzedItem = EvidenceItem.make({ measure: "analyzed-modules", count: paths.length })
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

  const invisibleTests = deriveSignals(invisibleAdvice)

  // TestabilityAdvisers keeps direct exports together because they share seam evidence.
  class TestabilityAdvisers extends Data.Class<{
    readonly hardToTestHotspotExamples: typeof hardToTestHotspotExamples
    readonly hardToTestHotspot: typeof hardToTestHotspot
    readonly hypotheticalSeamExamples: typeof hypotheticalSeamExamples
    readonly hypotheticalSeam: typeof hypotheticalSeam
    readonly invisibleTests: typeof invisibleTests
  }> {}

  return new TestabilityAdvisers({
    hardToTestHotspotExamples,
    hardToTestHotspot,
    hypotheticalSeamExamples,
    hypotheticalSeam,
    invisibleTests
  })
}

export const {
  hardToTestHotspotExamples,
  hardToTestHotspot,
  hypotheticalSeamExamples,
  hypotheticalSeam,
  invisibleTests
} = makeArchitectureExploreTestabilityAdvisers()
