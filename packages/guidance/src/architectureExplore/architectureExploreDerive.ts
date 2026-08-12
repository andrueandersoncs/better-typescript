import { architectureExploreIsTestPath } from "./architectureExploreIsTestPath.js"
import path from "node:path"
import {
  Array,
  Data,
  Function,
  HashMap,
  Option,
  Order,
  Predicate,
  Record,
  Result,
  Schema,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { Advice } from "@better-typescript/core/engine/derive/advice"
import { EvidenceItem } from "@better-typescript/core/engine/derive/evidenceItem"
import { deriveSignals } from "@better-typescript/core/engine/derive/deriveSignals"
import { NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { Location } from "@better-typescript/core/engine/location/locationData"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import { makePackageExamples } from "../makePackageExamples.js"
import { WorkspaceImportEdge } from "./architectureExploreWorkspaceImportEdge.js"
import { ModuleGraphData } from "@better-typescript/matchers/builtins/moduleGraph"
import { InterfaceBurdenData } from "@better-typescript/matchers/builtins/interfaceBurdenData"
import { ContextTagSeamData } from "@better-typescript/matchers/builtins/contextTagSeams"
import { SeamLeakageData } from "@better-typescript/matchers/builtins/seamLeakageEvidence"
import { ExportSurfaceData } from "@better-typescript/matchers/builtins/exportSurface"
import { ExportedSymbolUsage } from "@better-typescript/matchers/builtins/architectureExplore/exportedSymbolUsage"
import { ImportedNameUsage } from "@better-typescript/matchers/builtins/architectureExplore/importedNameUsage"
import { CompositionFingerprintData } from "@better-typescript/matchers/builtins/compositionFingerprints"
import { CompositionForwarderData } from "@better-typescript/matchers/builtins/compositionForwarders"
import { ImportUsageData } from "@better-typescript/matchers/builtins/importUsage"
import { ModuleIdentityData } from "@better-typescript/matchers/builtins/moduleIdentity"
import { PassThroughWrapperData } from "@better-typescript/matchers/builtins/passThroughWrappers"
import { TestOnlyExportData } from "@better-typescript/matchers/builtins/testOnlyExports"
import { SemanticModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine.js"
import type { SemanticModulePlacementEntityRecord as PlacementEntity } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementEntityRecord.js"
import { MixedPhysicalModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementMixedData.js"
import type { SemanticModulePlacementModuleSlice as ModuleSlice } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementModuleSlice.js"
import { SplitSemanticModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementSplitData.js"

import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog.js"
import { architectureExploreCorePolicies } from "../preset/architectureExploreCorePolicies.js"
import { makeArchitectureExplorePolicies } from "../preset/semanticModulePlacementPolicies.js"
import { architectureExploreOopPolicies } from "../preset/architectureExploreOopPolicies.js"
import { compositionFingerprints as compositionFingerprintsPolicy } from "../preset/compositionFingerprints.js"
import { compositionForwarders as compositionForwardersPolicy } from "../preset/compositionForwarders.js"
import { contextTagSeams as contextTagSeamsPolicy } from "../preset/contextTagSeams.js"
import { moduleScopeEffects as moduleScopeEffectsPolicy } from "../preset/moduleScopeEffects.js"

// Architecture Explore derive owns every adviser because exclusive ownership keeps one module.
const placementDeclarationKinds = {
  FunctionDeclaration: "function",
  ClassDeclaration: "class",
  InterfaceDeclaration: "interface",
  TypeAliasDeclaration: "type alias",
  EnumDeclaration: "enum",
  VariableDeclaration: "variable",
  ModuleDeclaration: "namespace"
} as const

const makeArchitectureExploreExports = () => {
  const [
    passThroughWrappersPolicy,
    interfaceBurdenPolicy,
    moduleGraphPolicy,
    testOnlyExportsPolicy,
    seamLeakageEvidencePolicy,
    importUsagePolicy,
    moduleIdentityPolicy,
    exportSurfacePolicy
  ] = architectureExploreCorePolicies

  const [externalDependencyConstructionPolicy, singleAdapterSeamsPolicy] =
    architectureExploreOopPolicies

  // Evidence helpers stay with advisers because exclusive ownership keeps one Semantic Module.
  const deriveCheckedData = <A>(
    guard: (input: unknown) => input is A,
    element: NamedDetection
  ): Option.Option<A> =>
    guard(element.detection.data) ? Option.some(element.detection.data) : Option.none<A>()

  const passThroughDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(PassThroughWrapperData), element)

  const interfaceBurdenDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(InterfaceBurdenData), element)

  const deriveModuleGraphDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ModuleGraphData), element)

  const testOnlyExportDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(TestOnlyExportData), element)

  const seamLeakageDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(SeamLeakageData), element)

  const passThroughIsDeletable = (data: PassThroughWrapperData) => {
    const hasAtMostOneCaller = data.callerCount <= 1
    const hasOnlyCallReferences = !data.hasNonCallReference

    return hasAtMostOneCaller && hasOnlyCallReferences
  }

  const isDeletableWrapper = (element: NamedDetection) =>
    pipe(passThroughDataOf(element), Option.exists(passThroughIsDeletable))

  const importUsageDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ImportUsageData), element)

  const exportSurfaceDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ExportSurfaceData), element)

  const compositionForwarderDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(CompositionForwarderData), element)

  const contextTagSeamDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(ContextTagSeamData), element)

  const compositionFingerprintDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(CompositionFingerprintData), element)

  // Composition forwarders join the deletable set because FP wrappers carry the same judgment.

  const isDeletableComposition = (element: NamedDetection) =>
    pipe(
      compositionForwarderDataOf(element),
      Option.exists((data: CompositionForwarderData) => {
        const hasAtMostOneCaller = data.callerCount <= 1
        const hasOnlyCallReferences = !data.hasNonCallReference

        return hasAtMostOneCaller && hasOnlyCallReferences
      })
    )

  const isDeletableShallowness = (element: NamedDetection) =>
    isDeletableWrapper(element) || isDeletableComposition(element)

  const shallownessNames = Array.make(
    passThroughWrappersPolicy.name,
    compositionForwardersPolicy.name
  )

  const isShallownessName = (name: string) => Array.contains(shallownessNames, name)

  const deriveDirectorySegments = (filePath: string): ReadonlyArray<string> => {
    const normalized = filePath.replaceAll("\\", "/")
    const separator = normalized.lastIndexOf("/")
    const directory = strictEqual(-1)(separator) ? "." : normalized.slice(0, separator)

    return directory.split("/")
  }

  const deriveCommonDirectory = (paths: ReadonlyArray<string>) => {
    const allSegments = Array.map(paths, deriveDirectorySegments)
    const fallback = Array.of(".")
    const first = pipe(Array.head(allSegments), Option.getOrElse(Function.constant(fallback)))
    const remaining = Array.drop(allSegments, 1)

    const takeCommonPrefix = (prefix: ReadonlyArray<string>, segments: ReadonlyArray<string>) =>
      Array.takeWhile(prefix, (segment, index) => {
        const candidate = Array.get(segments, index)

        return Option.contains(candidate, segment)
      })

    const common = Array.reduce(remaining, first, takeCommonPrefix)

    return strictEqual(0)(common.length) ? "." : Array.join(common, "/")
  }

  // WorkspaceImportEdge is the joined cross-package edge because advisers need one shared graph.
  const emptyImportedNames: ReadonlyArray<ImportedNameUsage> = Array.empty()
  const isModuleIdentityData = Schema.is(ModuleIdentityData)

  const aliasEntriesOf = (element: NamedDetection): ReadonlyArray<readonly [string, string]> =>
    pipe(
      deriveCheckedData(isModuleIdentityData, element),
      Option.map((data: ModuleIdentityData) => {
        const pairWithWorkspace = (alias: string) => Tuple.make(alias, data.workspacePath)

        return Array.map(data.aliases, pairWithWorkspace)
      }),
      Option.getOrElse(Array.empty)
    )

  const graphEdgesOf = (element: NamedDetection): ReadonlyArray<WorkspaceImportEdge> =>
    pipe(
      deriveModuleGraphDataOf(element),
      Option.map((data: ModuleGraphData) => {
        const fromTest = architectureExploreIsTestPath(data.workspacePath)

        const makeWorkspaceImportEdge = (importedPath: string) =>
          new WorkspaceImportEdge({
            importerPath: data.workspacePath,
            importedPath,
            fromTest,
            names: emptyImportedNames
          })

        return Array.map(data.importedWorkspacePaths, makeWorkspaceImportEdge)
      }),
      Option.getOrElse(Array.empty)
    )

  const usageEdgeOf = (aliasTable: HashMap.HashMap<string, string>) => (element: NamedDetection) =>
    pipe(
      importUsageDataOf(element),
      Option.flatMap((data: ImportUsageData) => {
        const makeWorkspaceImportEdge = (importedPath: string) =>
          new WorkspaceImportEdge({
            importerPath: data.importerWorkspacePath,
            importedPath,
            fromTest: data.fromTest,
            names: data.names
          })

        return pipe(HashMap.get(aliasTable, data.specifier), Option.map(makeWorkspaceImportEdge))
      })
    )

  // Graph and alias edges stay disjoint because project edges never carry bare package specifiers.

  const deriveWorkspaceImportEdges = (
    elements: ReadonlyArray<NamedDetection>
  ): ReadonlyArray<WorkspaceImportEdge> => {
    const isModuleIdentityElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(moduleIdentityPolicy.name)
    )

    const isModuleGraphElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(moduleGraphPolicy.name)
    )

    const isImportUsageElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(importUsagePolicy.name)
    )

    const identityElements = Array.filter(elements, isModuleIdentityElement)
    const aliasEntries = Array.flatMap(identityElements, aliasEntriesOf)
    const aliasTable = HashMap.fromIterable(aliasEntries)

    const graphEdges = pipe(
      elements,
      Array.filter(isModuleGraphElement),
      Array.flatMap(graphEdgesOf)
    )

    const usageEdges = pipe(
      elements,
      Array.filter(isImportUsageElement),
      Array.filterMap(Function.flow(usageEdgeOf(aliasTable), Result.fromOption(Function.constVoid)))
    )

    return Array.appendAll(graphEdges, usageEdges)
  }

  // bounceCluster: collocated because exclusive ownership keeps one Semantic Module.
  const bounceClusterExamples = makePackageExamples("bounce-cluster")
  const minimumThinFiles = 3

  const neighborsOf = (
    edges: ReadonlyArray<readonly [string, string]>,
    path: string
  ): ReadonlyArray<string> =>
    pipe(
      edges,
      Array.flatMap((edge) => {
        const from = Tuple.get(edge, 0)
        const to = Tuple.get(edge, 1)

        if (strictEqual(path)(from)) {
          return Array.of(to)
        }

        return strictEqual(path)(to) ? Array.of(from) : Array.empty()
      }),
      Array.dedupe
    )

  const reachable = (
    edges: ReadonlyArray<readonly [string, string]>,
    frontier: ReadonlyArray<string>,
    visited: ReadonlyArray<string>
  ): ReadonlyArray<string> => {
    const visit = (next: string): ReadonlyArray<string> => {
      const remaining = Array.drop(frontier, 1)

      if (Array.contains(visited, next)) {
        return reachable(edges, remaining, visited)
      }

      const isUnvisited = (candidate: string) => !Array.contains(visited, candidate)
      const neighbors = pipe(neighborsOf(edges, next), Array.filter(isUnvisited))
      const expanded = Array.appendAll(remaining, neighbors)
      const nextVisited = Array.append(visited, next)

      return reachable(edges, expanded, nextVisited)
    }

    return pipe(
      Array.head(frontier),
      Option.match({
        onNone: () => visited,
        onSome: visit
      })
    )
  }

  const connectedComponents = (
    paths: ReadonlyArray<string>,
    edges: ReadonlyArray<readonly [string, string]>
  ): ReadonlyArray<ReadonlyArray<string>> => {
    const collect = (
      remaining: ReadonlyArray<string>,
      components: ReadonlyArray<ReadonlyArray<string>>
    ): ReadonlyArray<ReadonlyArray<string>> => {
      const collectSeed = (seed: string): ReadonlyArray<ReadonlyArray<string>> => {
        const frontier = Array.of(seed)
        const visited = Array.empty<string>()
        const component = reachable(edges, frontier, visited)
        const isOutsideComponent = (path: string) => !Array.contains(component, path)
        const rest = Array.filter(remaining, isOutsideComponent)
        const nextComponents = Array.append(components, component)

        return collect(rest, nextComponents)
      }

      return pipe(
        Array.head(remaining),
        Option.match({
          onNone: () => components,
          onSome: collectSeed
        })
      )
    }

    const components = Array.empty<ReadonlyArray<string>>()

    return collect(paths, components)
  }

  const bounceAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const detectionPath = flow(
      Struct.get<NamedDetection, "detection">("detection"),
      Struct.get<NamedDetection["detection"], "location">("location"),
      Struct.get<NamedDetection["detection"]["location"], "path">("path")
    )

    const elementHasShallownessName = (element: NamedDetection) => isShallownessName(element.name)

    const shallowPaths = pipe(
      elements,
      Array.filter(elementHasShallownessName),
      Array.filter(isDeletableShallowness),
      Array.map(detectionPath),
      Array.dedupe
    )

    const isModuleGraphElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(moduleGraphPolicy.name)
    )

    const graphElements = Array.filter(elements, isModuleGraphElement)

    const edges = Array.flatMap(graphElements, (element) => {
      const pairWithFrom = (to: string) => Tuple.make(element.detection.location.path, to)

      const isShallowTarget = (to: string) => {
        const fromIsShallow = Array.contains(shallowPaths, element.detection.location.path)
        const toIsShallow = Array.contains(shallowPaths, to)

        return fromIsShallow && toIsShallow
      }

      const shallowEdgesFrom = (data: ModuleGraphData) =>
        pipe(data.importedPaths, Array.filter(isShallowTarget), Array.map(pairWithFrom))

      return pipe(
        deriveModuleGraphDataOf(element),
        Option.map(shallowEdgesFrom),
        Option.getOrElse(Array.empty)
      )
    })

    const hasMinimumThinFiles = (component: ReadonlyArray<string>) =>
      component.length >= minimumThinFiles

    const hasInternalEdge = (component: ReadonlyArray<string>) =>
      Array.some(edges, (edge) => {
        const from = Tuple.get(edge, 0)
        const to = Tuple.get(edge, 1)
        const containsFrom = Array.contains(component, from)
        const containsTo = Array.contains(component, to)

        return containsFrom && containsTo
      })

    const components = pipe(
      connectedComponents(shallowPaths, edges),
      Array.filter(hasMinimumThinFiles),
      Array.filter(hasInternalEdge)
    )

    return Array.map(components, (component) => {
      const edgeCount = Array.countBy(edges, (edge) => {
        const from = Tuple.get(edge, 0)
        const to = Tuple.get(edge, 1)
        const containsFrom = Array.contains(component, from)
        const containsTo = Array.contains(component, to)

        return containsFrom && containsTo
      })

      const directory = deriveCommonDirectory(component)
      const location = Location.make({ path: directory })

      const thinModulesItem = EvidenceItem.make({
        measure: "thin-modules",
        count: component.length
      })

      const moduleEdgesItem = EvidenceItem.make({ measure: "module-edges", count: edgeCount })
      const evidence = Array.make(thinModulesItem, moduleEdgesItem)

      return Advice.make({
        location,
        level: "directory",
        title: "bounce cluster",
        remediation:
          "Understanding one flow requires traversing connected low-leverage forwarding Modules. " +
          "Collapse this import path behind one deeper interface so policy and verification become local.",
        evidence,
        examples: bounceClusterExamples
      })
    })
  }

  const bounceCluster = deriveSignals(bounceAdvice)
  // deletionTestShallowness: collocated because exclusive ownership keeps one Semantic Module.
  const deletionTestShallownessExamples = makePackageExamples("deletion-test-shallowness")

  const callerCountOf = (element: NamedDetection) =>
    pipe(
      passThroughDataOf(element),
      Option.map(Struct.get<PassThroughWrapperData, "callerCount">("callerCount")),
      Option.orElse(() =>
        pipe(
          compositionForwarderDataOf(element),
          Option.map(Struct.get<CompositionForwarderData, "callerCount">("callerCount"))
        )
      ),
      Option.getOrElse(Function.constant(0))
    )

  const deletionAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const elementHasShallownessName = (element: NamedDetection) => isShallownessName(element.name)

    const detectionPath = flow(
      Struct.get<NamedDetection, "detection">("detection"),
      Struct.get<NamedDetection["detection"], "location">("location"),
      Struct.get<NamedDetection["detection"]["location"], "path">("path")
    )

    const wrappers = pipe(
      elements,
      Array.filter(elementHasShallownessName),
      Array.filter(isDeletableShallowness)
    )

    const paths = pipe(wrappers, Array.map(detectionPath), Array.dedupe)

    return Array.map(paths, (filePath) => {
      const hasPath = flow(
        Struct.get<NamedDetection, "detection">("detection"),
        Struct.get<NamedDetection["detection"], "location">("location"),
        Struct.get<NamedDetection["detection"]["location"], "path">("path"),
        strictEqual(filePath)
      )

      const atPath = Array.filter(wrappers, hasPath)

      const callerCount = pipe(
        atPath,
        Array.map(callerCountOf),
        Array.reduce(0, (total, count) => total + count)
      )

      const forwardersItem = EvidenceItem.make({
        measure: "deletable-forwarders",
        count: atPath.length
      })

      const callersItem = EvidenceItem.make({ measure: "production-callers", count: callerCount })
      const evidence = Array.make(forwardersItem, callersItem)
      const location = Location.make({ path: filePath })

      return Advice.make({
        location,
        level: "file",
        title: "deletion-test shallowness",
        remediation:
          "Deleting these exact forwarders removes indirection without spreading policy across production callers. " +
          "Inline the one-use operation or collapse the re-export into the intended public interface; keep a Module " +
          "when behaviour would reappear across multiple callers.",
        evidence,
        examples: deletionTestShallownessExamples
      })
    })
  }

  const deletionTestShallowness = deriveSignals(deletionAdvice)
  // duplicatedOrchestration: collocated because exclusive ownership keeps one Semantic Module.
  const duplicatedOrchestrationExamples = makePackageExamples("duplicated-orchestration")
  const minimumDuplicateSites = 2

  const duplicatedOrchestrationAdvice = (
    elements: ReadonlyArray<NamedDetection>
  ): ReadonlyArray<Advice> => {
    const isCompositionFingerprintElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(compositionFingerprintsPolicy.name)
    )

    const fingerprintElements = pipe(
      elements,
      Array.filter(isCompositionFingerprintElement),
      Array.filter(Function.flow(compositionFingerprintDataOf, Option.isSome))
    )

    const fingerprintKey = (element: NamedDetection) =>
      pipe(
        element,
        compositionFingerprintDataOf,
        Option.map((data: CompositionFingerprintData) => `${data.projectPath}:${data.fingerprint}`),
        Option.getOrThrow
      )

    const grouped = Array.groupBy(fingerprintElements, fingerprintKey)

    return pipe(
      Record.toEntries(grouped),
      Array.filterMap(([_fingerprint, matchingElements]) => {
        const paths = pipe(
          matchingElements,
          Array.map(
            Function.flow(
              Struct.get<NamedDetection, "detection">("detection"),
              Struct.get<NamedDetection["detection"], "location">("location"),
              Struct.get<NamedDetection["detection"]["location"], "path">("path")
            )
          ),
          Array.dedupe
        )

        if (paths.length < minimumDuplicateSites) {
          return Result.failVoid
        }

        const stepCount = pipe(
          Array.head(matchingElements),
          Option.flatMap(compositionFingerprintDataOf),
          Option.map(Struct.get<CompositionFingerprintData, "stepCount">("stepCount")),
          Option.getOrElse(Function.constant(0))
        )

        const directory = deriveCommonDirectory(paths)
        const location = Location.make({ path: directory })
        const sitesItem = EvidenceItem.make({ measure: "duplicate-sites", count: paths.length })
        const stepsItem = EvidenceItem.make({ measure: "orchestration-steps", count: stepCount })
        const evidence = Array.make(sitesItem, stepsItem)

        const advice = Advice.make({
          location,
          level: "directory",
          title: "duplicated orchestration",
          remediation:
            "The same call shape is re-plumbed at several sites; name the operation once and let callers " +
            "compose it, because the duplicated derive/concat shape invites drift.",
          evidence,
          examples: duplicatedOrchestrationExamples
        })

        return Result.succeed(advice)
      })
    )
  }

  const duplicatedOrchestration = deriveSignals(duplicatedOrchestrationAdvice)
  // hardToTestHotspot: collocated because exclusive ownership keeps one Semantic Module.
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
  // hubModule: collocated because exclusive ownership keeps one Semantic Module.
  const hubModuleExamples = makePackageExamples("hub-module")
  const minimumOperations = 12
  const minimumFanIn = 3
  const minimumFanOut = 6

  const hubAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const edges = deriveWorkspaceImportEdges(elements)

    const isInterfaceBurdenElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(interfaceBurdenPolicy.name)
    )

    const isModuleGraphElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(moduleGraphPolicy.name)
    )

    const isProductionWorkspaceBurden = (data: InterfaceBurdenData) =>
      pipe(
        data.workspacePath,
        Option.liftPredicate(Predicate.isString),
        Option.exists((workspacePath) => {
          const hasWorkspacePath = !strictEqual("")(workspacePath)
          const hasProductionPath = !architectureExploreIsTestPath(workspacePath)
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
      Array.filterMap(Function.flow(deriveModuleGraphDataOf, Result.fromOption(Function.constVoid)))
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
        Array.map(Struct.get<WorkspaceImportEdge, "importerPath">("importerPath")),
        Array.dedupe
      ).length

      const matchesWorkspacePath = flow(
        Struct.get<(typeof moduleGraphs)[number], "workspacePath">("workspacePath"),
        strictEqual(burden.workspacePath)
      )

      const fanOut = pipe(
        moduleGraphs,
        Array.findFirst(matchesWorkspacePath),
        Option.map((data: ModuleGraphData) => data.importedWorkspacePaths.length),
        Option.getOrElse(Function.constant(0))
      )

      const operationsBelowMinimum = burden.operationCount < minimumOperations
      const fanInBelowMinimum = fanIn < minimumFanIn
      const fanOutBelowMinimum = fanOut < minimumFanOut

      const minimumChecks = Array.make(
        operationsBelowMinimum,
        fanInBelowMinimum,
        fanOutBelowMinimum
      )

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

  const hubModule = deriveSignals(hubAdvice)
  // hypotheticalSeam: collocated because exclusive ownership keeps one Semantic Module.
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
  // leakedSeam: collocated because exclusive ownership keeps one Semantic Module.
  const leakedSeamExamples = makePackageExamples("leaked-seam")
  const minimumLeaks = 2
  const isProductionPath = Predicate.not(architectureExploreIsTestPath)

  const directoryEdgesFromData = (
    data: ModuleGraphData
  ): ReadonlyArray<readonly [string, string]> => {
    if (architectureExploreIsTestPath(data.workspacePath)) {
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
      deriveModuleGraphDataOf(element),
      Option.map(directoryEdgesFromData),
      Option.getOrElse(Array.empty)
    )

  const fileLeakAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const isSeamLeakageElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(seamLeakageEvidencePolicy.name)
    )

    const hasPath = (filePath: string) =>
      flow(
        Struct.get<NamedDetection, "detection">("detection"),
        Struct.get<NamedDetection["detection"], "location">("location"),
        Struct.get<NamedDetection["detection"]["location"], "path">("path"),
        strictEqual(filePath)
      )

    const isInternalPath = flow(
      Struct.get<SeamLeakageData, "kind">("kind"),
      strictEqual("internal-path")
    )

    const leaks = Array.filter(elements, isSeamLeakageElement)

    const paths = pipe(
      leaks,
      Array.map(
        flow(
          Struct.get<NamedDetection, "detection">("detection"),
          Struct.get<NamedDetection["detection"], "location">("location"),
          Struct.get<NamedDetection["detection"]["location"], "path">("path")
        )
      ),
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
      strictEqual(moduleGraphPolicy.name)
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

  const leakedSeam = deriveSignals(leakedSeamAdvice)
  // registrationCeremony: collocated because exclusive ownership keeps one Semantic Module.
  const registrationCeremonyExamples = makePackageExamples("registration-ceremony")
  const minimumImportCount = 15
  const minimumLowRefRatio = 0.8

  const registrationAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const isImportUsageElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(importUsagePolicy.name)
    )

    const usages = pipe(
      elements,
      Array.filter(isImportUsageElement),
      Array.filterMap(Function.flow(importUsageDataOf, Result.fromOption(Function.constVoid))),
      Array.filter((data: ImportUsageData) => !data.fromTest)
    )

    const importers = pipe(
      usages,
      Array.map(Struct.get<ImportUsageData, "importerWorkspacePath">("importerWorkspacePath")),
      Array.dedupe
    )

    return Array.filterMap(importers, (importerPath) => {
      const isAtImporter = flow(
        Struct.get<ImportUsageData, "importerWorkspacePath">("importerWorkspacePath"),
        strictEqual(importerPath)
      )

      const atImporter = Array.filter(usages, isAtImporter)

      const importCount = pipe(
        atImporter,
        Array.map(Struct.get<ImportUsageData, "specifier">("specifier")),
        Array.dedupe
      ).length

      const names = Array.flatMap(atImporter, Struct.get<ImportUsageData, "names">("names"))

      if (strictEqual(0)(names.length)) {
        return Result.failVoid
      }

      const lowRefNames = Array.countBy(
        names,
        (name: ImportedNameUsage) => name.referenceCount <= 2
      )

      const ratio = lowRefNames / names.length
      const importsBelowMinimum = importCount < minimumImportCount
      const ratioBelowMinimum = ratio < minimumLowRefRatio
      const minimumChecks = Array.make(importsBelowMinimum, ratioBelowMinimum)
      const isBelowMinimum = Array.some(minimumChecks, Boolean)

      if (isBelowMinimum) {
        return Result.failVoid
      }

      const location = Location.make({ path: importerPath })

      const importedModulesItem = EvidenceItem.make({
        measure: "imported-modules",
        count: importCount
      })

      const singleUseItem = EvidenceItem.make({ measure: "single-use-imports", count: lowRefNames })
      const evidence = Array.make(importedModulesItem, singleUseItem)

      const advice = Advice.make({
        location,
        level: "file",
        title: "registration ceremony",
        remediation:
          "A registration ceremony restates every Module once as an import and again as a collected entry. " +
          "Collapse it behind one authoring interface so adding an entry touches one file.",
        evidence,
        examples: registrationCeremonyExamples
      })

      return Result.succeed(advice)
    })
  }

  const registrationCeremony = deriveSignals(registrationAdvice)
  // testPastInterface: collocated because exclusive ownership keeps one Semantic Module.
  const testPastInterfaceExamples = makePackageExamples("test-past-interface")

  const deriveEdgesForSymbol = (
    edges: ReadonlyArray<WorkspaceImportEdge>,
    workspacePath: string,
    symbolName: string,
    fromTest: boolean
  ): ReadonlyArray<WorkspaceImportEdge> =>
    Array.filter(edges, (edge) => {
      const importsWorkspacePath = strictEqual(workspacePath)(edge.importedPath)
      const matchesTestOrigin = strictEqual(fromTest)(edge.fromTest)

      const usageHasSymbolName = flow(
        Struct.get<ImportedNameUsage, "name">("name"),
        strictEqual(symbolName)
      )

      const importsSymbol = Array.some(edge.names, usageHasSymbolName)
      const conditions = Array.make(importsWorkspacePath, matchesTestOrigin, importsSymbol)

      return Array.every(conditions, Boolean)
    })

  const crossTestCallCount = (edges: ReadonlyArray<WorkspaceImportEdge>, symbolName: string) => {
    const usageHasSymbolName = flow(
      Struct.get<ImportedNameUsage, "name">("name"),
      strictEqual(symbolName)
    )

    return pipe(
      edges,
      Array.flatMap(Struct.get<WorkspaceImportEdge, "names">("names")),
      Array.filter(usageHasSymbolName),
      Array.reduce(0, (total, usage) => total + usage.callCount)
    )
  }

  const workspaceTestOnlySymbols =
    (edges: ReadonlyArray<WorkspaceImportEdge>) =>
    (data: ExportSurfaceData): ReadonlyArray<ExportedSymbolUsage> =>
      Array.filter(data.symbols, (symbol) => {
        const crossProdImports = deriveEdgesForSymbol(edges, data.workspacePath, symbol.name, false)
        const crossTestImports = deriveEdgesForSymbol(edges, data.workspacePath, symbol.name, true)
        const inProjectProd = symbol.referencingFileCount - symbol.referencingTestFileCount
        const productionCallers = inProjectProd + crossProdImports.length
        const hasNoProductionCallers = strictEqual(0)(productionCallers)
        const hasCrossTestImports = crossTestImports.length > 0
        const conditions = Array.make(hasNoProductionCallers, hasCrossTestImports)

        return Array.every(conditions, Boolean)
      })

  const isSeamLeakageFromTest = Function.flow(
    seamLeakageDataOf,
    Option.exists(Struct.get<SeamLeakageData, "fromTest">("fromTest"))
  )

  const testPastInterfaceAdvice = (
    elements: ReadonlyArray<NamedDetection>
  ): ReadonlyArray<Advice> => {
    const isTestOnlyExportElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(testOnlyExportsPolicy.name)
    )

    const isSeamLeakageElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(seamLeakageEvidencePolicy.name)
    )

    const isExportSurfaceElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(exportSurfacePolicy.name)
    )

    const testOnlyExports = Array.filter(elements, isTestOnlyExportElement)

    const testImports = pipe(
      elements,
      Array.filter(isSeamLeakageElement),
      Array.filter(isSeamLeakageFromTest)
    )

    const edges = deriveWorkspaceImportEdges(elements)
    const exportSurfaces = Array.filter(elements, isExportSurfaceElement)
    const testOnlySymbolsOf = workspaceTestOnlySymbols(edges)

    const hasTestOnlySymbols = (element: NamedDetection) =>
      pipe(
        exportSurfaceDataOf(element),
        Option.exists((data: ExportSurfaceData) => {
          const symbols = testOnlySymbolsOf(data)

          return symbols.length > 0
        })
      )

    const programPaths = pipe(
      Array.appendAll(testOnlyExports, testImports),
      Array.map(
        flow(
          Struct.get<NamedDetection, "detection">("detection"),
          Struct.get<NamedDetection["detection"], "location">("location"),
          Struct.get<NamedDetection["detection"]["location"], "path">("path")
        )
      )
    )

    const workspacePaths = pipe(
      exportSurfaces,
      Array.filter(hasTestOnlySymbols),
      Array.map(
        flow(
          Struct.get<NamedDetection, "detection">("detection"),
          Struct.get<NamedDetection["detection"], "location">("location"),
          Struct.get<NamedDetection["detection"]["location"], "path">("path")
        )
      )
    )

    const paths = pipe(Array.appendAll(programPaths, workspacePaths), Array.dedupe)

    return Array.map(paths, (filePath) => {
      const hasPath = flow(
        Struct.get<NamedDetection, "detection">("detection"),
        Struct.get<NamedDetection["detection"], "location">("location"),
        Struct.get<NamedDetection["detection"]["location"], "path">("path"),
        strictEqual(filePath)
      )

      const exportsAtPath = Array.filter(testOnlyExports, hasPath)
      const importsAtPath = Array.filter(testImports, hasPath)
      const workspaceAtPath = Array.filter(exportSurfaces, hasPath)

      const workspaceDataAtPath = pipe(
        workspaceAtPath,
        Array.filterMap(Function.flow(exportSurfaceDataOf, Result.fromOption(Function.constVoid)))
      )

      const exportTestCallCount = pipe(
        exportsAtPath,
        Array.filterMap(Function.flow(testOnlyExportDataOf, Result.fromOption(Function.constVoid))),
        Array.reduce(0, (total, data) => total + data.testCallCount)
      )

      const emptyWorkspaceEvidence = Tuple.make(0, 0)

      const workspaceEvidence = pipe(
        workspaceDataAtPath,
        Array.reduce(emptyWorkspaceEvidence, (totals, data) => {
          const symbols = testOnlySymbolsOf(data)
          const symbolCount = Tuple.get(totals, 0)
          const callCount = Tuple.get(totals, 1)

          const callsAtSurface = pipe(
            symbols,
            Array.reduce(0, (total, symbol) => {
              const crossTestImports = deriveEdgesForSymbol(
                edges,
                data.workspacePath,
                symbol.name,
                true
              )

              const crossTestCalls = crossTestCallCount(crossTestImports, symbol.name)
              return total + symbol.callCount + crossTestCalls
            })
          )

          const nextSymbolCount = symbolCount + symbols.length
          const nextCallCount = callCount + callsAtSurface

          return Tuple.make(nextSymbolCount, nextCallCount)
        })
      )

      const workspaceSymbolCount = Tuple.get(workspaceEvidence, 0)
      const workspaceTestCallCount = Tuple.get(workspaceEvidence, 1)
      const testCallCount = exportTestCallCount + workspaceTestCallCount
      const location = Location.make({ path: filePath })

      const exportsItem = EvidenceItem.make({
        measure: testOnlyExportsPolicy.name,
        count: exportsAtPath.length + workspaceSymbolCount
      })

      const callsItem = EvidenceItem.make({ measure: "test-helper-calls", count: testCallCount })

      const importsItem = EvidenceItem.make({
        measure: "test-deep-imports",
        count: importsAtPath.length
      })

      const evidence = Array.make(exportsItem, callsItem, importsItem)

      return Advice.make({
        location,
        level: "file",
        title: "test past interface",
        remediation:
          "Tests and production callers must cross the same interface. Exercise observable behaviour through the public Module, " +
          "make test-only helpers private, and replace internal/source imports with the declared seam.",
        evidence,
        examples: testPastInterfaceExamples
      })
    })
  }

  const testPastInterface = deriveSignals(testPastInterfaceAdvice)
  // wideShallowInterface: collocated because exclusive ownership keeps one Semantic Module.
  const wideShallowInterfaceExamples = makePackageExamples("wide-shallow-interface")
  const minimumForwarders = 3

  const wideShallowAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
    const isInterfaceBurdenElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(interfaceBurdenPolicy.name)
    )

    const elementHasShallownessName = (element: NamedDetection) => isShallownessName(element.name)
    const burden = Array.filter(elements, isInterfaceBurdenElement)

    const wrappers = pipe(
      elements,
      Array.filter(elementHasShallownessName),
      Array.filter(isDeletableShallowness)
    )

    return Array.filterMap(burden, (burdenElement) => {
      const hasPath = flow(
        Struct.get<NamedDetection, "detection">("detection"),
        Struct.get<NamedDetection["detection"], "location">("location"),
        Struct.get<NamedDetection["detection"]["location"], "path">("path"),
        strictEqual(burdenElement.detection.location.path)
      )

      const forwarders = Array.filter(wrappers, hasPath)

      if (forwarders.length < minimumForwarders) {
        return Result.failVoid
      }

      return pipe(
        interfaceBurdenDataOf(burdenElement),
        Option.filter((data: InterfaceBurdenData) => forwarders.length * 2 > data.operationCount),
        Option.map((data: InterfaceBurdenData) => {
          const location = Location.make({ path: burdenElement.detection.location.path })

          const operationsItem = EvidenceItem.make({
            measure: "interface-operations",
            count: data.operationCount
          })

          const parametersItem = EvidenceItem.make({
            measure: "required-parameters",
            count: data.requiredParameterCount
          })

          const forwardersItem = EvidenceItem.make({
            measure: "deletable-forwarders",
            count: forwarders.length
          })

          const evidence = Array.make(operationsItem, parametersItem, forwardersItem)

          return Advice.make({
            location,
            level: "file",
            title: "wide shallow interface",
            remediation:
              "This public interface carries many operations while most of its surface is low-leverage forwarding. " +
              "Collapse the forwarders and expose the smaller domain operation that hides configuration, ordering, and adapter details.",
            evidence,
            examples: wideShallowInterfaceExamples
          })
        }),
        Result.fromOption(Function.constVoid)
      )
    })
  }

  const wideShallowInterface = deriveSignals(wideShallowAdvice)

  // PlacementElement pairs NamedDetection+placement data because advice maps one snapshot element.
  class PlacementElement extends Data.Class<{
    readonly namedDetection: NamedDetection
    readonly data: SemanticModulePlacementData
  }> {}

  const interleaveModules = (modules: ReadonlyArray<ModuleSlice>): ReadonlyArray<string> => {
    const moduleAnchorEntity = (module: ModuleSlice) =>
      pipe(module.entities, Array.head, Option.getOrThrow)

    const humanDeclarationKind = (kind: PlacementEntity["declarationKind"]): string =>
      placementDeclarationKinds[kind]

    const entityRow = (entity: PlacementEntity) =>
      `    - ${entity.displayName} — ${humanDeclarationKind(entity.declarationKind)} — ${entity.key.path}:${entity.line}:${entity.column}`

    const moduleAnchorLine = (module: ModuleSlice) => {
      const anchor = moduleAnchorEntity(module)

      return `  Semantic Module anchored at ${anchor.key.path}:${anchor.line}:${anchor.column}`
    }

    const moduleMembershipLines = (module: ModuleSlice) => {
      const rows = Array.map(module.entities, entityRow)
      const anchorLine = moduleAnchorLine(module)

      return Array.prepend(rows, anchorLine)
    }

    const blocks = Array.map(modules, moduleMembershipLines)

    const appendMembershipBlock = (
      lines: ReadonlyArray<string>,
      block: ReadonlyArray<string>,
      index: number
    ) =>
      strictEqual(0)(index)
        ? Array.appendAll(lines, block)
        : pipe(lines, Array.append(""), Array.appendAll(block))

    const emptyLines = Array.empty<string>()

    return Array.reduce(blocks, emptyLines, appendMembershipBlock)
  }

  const moduleSlicesFromItems = (
    items: ReadonlyArray<PlacementElement>
  ): ReadonlyArray<ModuleSlice> => {
    const moduleAnchorEntity = (module: ModuleSlice) =>
      pipe(module.entities, Array.head, Option.getOrThrow)

    const moduleAnchorKey = (module: ModuleSlice) => moduleAnchorEntity(module).key

    const moduleAnchorPathOrder = Order.mapInput(
      Order.String,
      flow(moduleAnchorKey, Struct.get<PlacementEntity["key"], "path">("path"))
    )

    const moduleAnchorStartOrder = Order.mapInput(
      Order.Number,
      flow(moduleAnchorKey, Struct.get<PlacementEntity["key"], "start">("start"))
    )

    const moduleAnchorEndOrder = Order.mapInput(
      Order.Number,
      flow(moduleAnchorKey, Struct.get<PlacementEntity["key"], "end">("end"))
    )

    const moduleAnchorKindOrder = Order.mapInput(
      Order.Number,
      flow(moduleAnchorKey, Struct.get<PlacementEntity["key"], "syntaxKind">("syntaxKind"))
    )

    const moduleOrder = Order.combine(
      moduleAnchorPathOrder,
      Order.combine(
        moduleAnchorStartOrder,
        Order.combine(moduleAnchorEndOrder, moduleAnchorKindOrder)
      )
    )

    const anchorIdentity = (module: ModuleSlice) => {
      const key = moduleAnchorKey(module)

      return `${key.path}:${key.start}:${key.end}:${key.syntaxKind}`
    }

    const modulesShareAnchor = (left: ModuleSlice, right: ModuleSlice) => {
      const leftIdentity = anchorIdentity(left)
      const rightIdentity = anchorIdentity(right)

      return strictEqual(leftIdentity)(rightIdentity)
    }

    const dedupeModulesByAnchor = (modules: ReadonlyArray<ModuleSlice>) =>
      Array.dedupeWith(modules, modulesShareAnchor)

    return pipe(
      items,
      Array.flatMap((item) => item.data.modules),
      dedupeModulesByAnchor,
      Array.sort(moduleOrder)
    )
  }

  const semanticModulePlacementName = "semantic-module-placement"

  const semanticModulePlacementDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(SemanticModulePlacementData), element)

  const semanticModulePlacementAdviceBody = (
    elements: ReadonlyArray<NamedDetection>
  ): ReadonlyArray<Advice> => {
    // Signal names stay bound once because advisers and wirings must not re-spell them.
    const semanticModulePlacementAdviceExamples = makePackageExamples("semantic-module-placement")
    const isMixedData = Schema.is(MixedPhysicalModulePlacementData)
    const pathOf = (item: PlacementElement) => item.namedDetection.detection.location.path

    const uniquePhysicalPaths = (modules: ReadonlyArray<ModuleSlice>) =>
      pipe(
        modules,
        Array.flatMap(Struct.get<ModuleSlice, "physicalModulePaths">("physicalModulePaths")),
        Array.dedupe,
        Array.sort(Order.String)
      )

    const mixedTitle = "mixed Physical Module"
    const splitTitle = "split Semantic Modules"
    const physicalModulePathRow = (path: string) => `    - ${path}`

    const physicalModuleLines = (paths: ReadonlyArray<string>) => {
      const rows = Array.map(paths, physicalModulePathRow)

      return Array.prepend(rows, "  Current Physical Modules")
    }

    const entityCount = (modules: ReadonlyArray<ModuleSlice>) =>
      pipe(
        modules,
        Array.map((module: ModuleSlice) => module.entities.length),
        Array.reduce(0, (total, count) => total + count)
      )

    const entitiesInPath = (path: string) => (modules: ReadonlyArray<ModuleSlice>) => {
      const entities = Array.flatMap(modules, Struct.get<ModuleSlice, "entities">("entities"))

      const entityPathEquals = (entity: (typeof entities)[number]) =>
        strictEqual(path)(entity.key.path)

      return Array.reduce(entities, 0, (count, entity) =>
        entityPathEquals(entity) ? count + 1 : count
      )
    }

    const mixedRemediationLead = (moduleCount: number) =>
      `This Physical Module contains members of ${moduleCount} Semantic Modules. Separate the modules without splitting any membership listed below. No destination or move direction is inferred.`

    const splitRemediationLead = (splitCount: number) => {
      const noun = strictEqual(1)(splitCount) ? "Semantic Module" : "Semantic Modules"
      const verb = strictEqual(1)(splitCount) ? "spans" : "span"

      return (
        `${splitCount} ${noun} anchored in this Physical Module ${verb} multiple Physical Modules. ` +
        "Place each listed Semantic Module in one Physical Module. The anchor is only a deterministic reporting location; it is not a move recommendation."
      )
    }

    const mixedRemediation = (modules: ReadonlyArray<ModuleSlice>) => {
      const lead = mixedRemediationLead(modules.length)
      const membership = interleaveModules(modules)

      return pipe(Array.make(lead, ""), Array.appendAll(membership), Array.join("\n"))
    }

    const splitRemediation = (modules: ReadonlyArray<ModuleSlice>) => {
      const lead = splitRemediationLead(modules.length)
      const membership = interleaveModules(modules)
      const paths = uniquePhysicalPaths(modules)
      const physical = physicalModuleLines(paths)

      return pipe(
        Array.make(lead, ""),
        Array.appendAll(membership),
        Array.append(""),
        Array.appendAll(physical),
        Array.join("\n")
      )
    }

    const mixedEvidence = (path: string) => (modules: ReadonlyArray<ModuleSlice>) => {
      const here = entitiesInPath(path)(modules)
      const hereItem = EvidenceItem.make({ measure: "code-entities-here", count: here })
      const modulesItem = EvidenceItem.make({ measure: "semantic-modules", count: modules.length })

      return Array.make(hereItem, modulesItem)
    }

    const splitEvidence = (modules: ReadonlyArray<ModuleSlice>) => {
      const codeEntityCount = entityCount(modules)
      const physicalPaths = uniquePhysicalPaths(modules)

      const entitiesItem = EvidenceItem.make({
        measure: "code-entities",
        count: codeEntityCount
      })

      const physicalItem = EvidenceItem.make({
        measure: "physical-modules",
        count: physicalPaths.length
      })

      const splitItem = EvidenceItem.make({
        measure: "split-semantic-modules",
        count: modules.length
      })

      return Array.make(entitiesItem, physicalItem, splitItem)
    }

    const isPlacementElement = flow(
      Struct.get<NamedDetection, "name">("name"),
      strictEqual(semanticModulePlacementName)
    )

    const placementData = (element: NamedDetection): Option.Option<SemanticModulePlacementData> => {
      const matchesPlacement = isPlacementElement(element)

      const placementElementOption = matchesPlacement
        ? Option.some(element)
        : Option.none<NamedDetection>()

      return pipe(placementElementOption, Option.flatMap(semanticModulePlacementDataOf))
    }

    const isSplitData = Schema.is(SplitSemanticModulePlacementData)

    const placementElementResultOf = (element: NamedDetection) => {
      const dataOption = placementData(element)
      const dataResult = Result.fromOption(Function.constVoid)(dataOption)

      const makePlacementElementFromData = (data: SemanticModulePlacementData) =>
        new PlacementElement({ namedDetection: element, data })

      return Result.map(dataResult, makePlacementElementFromData)
    }

    const placementElements = (elements: ReadonlyArray<NamedDetection>) =>
      Array.filterMap(elements, placementElementResultOf)

    // Prefer Struct.get for sole property reads because dedicated wrappers hide Effect accessors.
    const placementElementData = Struct.get<PlacementElement, "data">("data")
    const itemDataIsMixed = flow(placementElementData, isMixedData)
    const itemDataIsSplit = flow(placementElementData, isSplitData)

    const mixedElements = (elements: ReadonlyArray<PlacementElement>) =>
      Array.filter(elements, itemDataIsMixed)

    const splitElements = (elements: ReadonlyArray<PlacementElement>) =>
      Array.filter(elements, itemDataIsSplit)

    const mixedPhysicalModulePath = (items: ReadonlyArray<PlacementElement>) =>
      pipe(
        items,
        Array.head,
        Option.map(Struct.get<PlacementElement, "data">("data")),
        Option.filter(isMixedData),
        Option.map(
          Struct.get<MixedPhysicalModulePlacementData, "physicalModulePath">("physicalModulePath")
        ),
        Option.getOrThrow
      )

    const makeMixedPathAdvice =
      (mixed: ReadonlyArray<PlacementElement>) =>
      (filePath: string): Advice => {
        const itemPathEqualsFilePath = flow(pathOf, strictEqual(filePath))
        const atPath = Array.filter(mixed, itemPathEqualsFilePath)
        const physicalModulePath = mixedPhysicalModulePath(atPath)
        const modules = moduleSlicesFromItems(atPath)
        const location = Location.make({ path: filePath })
        const remediation = mixedRemediation(modules)
        const evidence = mixedEvidence(physicalModulePath)(modules)

        return Advice.make({
          location,
          level: "file",
          title: mixedTitle,
          remediation,
          evidence,
          examples: semanticModulePlacementAdviceExamples
        })
      }

    const makeSplitPathAdvice =
      (split: ReadonlyArray<PlacementElement>) =>
      (filePath: string): Advice => {
        const itemPathEqualsFilePath = flow(pathOf, strictEqual(filePath))
        const atPath = Array.filter(split, itemPathEqualsFilePath)
        const modules = moduleSlicesFromItems(atPath)
        const location = Location.make({ path: filePath })
        const remediation = splitRemediation(modules)
        const evidence = splitEvidence(modules)

        return Advice.make({
          location,
          level: "file",
          title: splitTitle,
          remediation,
          evidence,
          examples: semanticModulePlacementAdviceExamples
        })
      }

    const uniquePaths = (items: ReadonlyArray<PlacementElement>) =>
      pipe(items, Array.map(pathOf), Array.dedupe, Array.sort(Order.String))

    const placement = placementElements(elements)
    const mixed = mixedElements(placement)
    const split = splitElements(placement)
    const mixedAdvice = pipe(mixed, uniquePaths, Array.map(makeMixedPathAdvice(mixed)))
    const splitAdvice = pipe(split, uniquePaths, Array.map(makeSplitPathAdvice(split)))

    // Mixed precedes split at one path because report sort is level then path only.
    return Array.appendAll(mixedAdvice, splitAdvice)
  }

  const semanticModulePlacementAdvice = deriveSignals(semanticModulePlacementAdviceBody)

  const nameArchitectureExploreDetections = (signal: Signal) =>
    Array.map(signal.detections, makeNamedDetection(signal.name))

  const architectureExploreAdvisers = Array.make(
    deletionTestShallowness,
    wideShallowInterface,
    bounceCluster,
    leakedSeam,
    testPastInterface,
    hardToTestHotspot,
    hypotheticalSeam,
    registrationCeremony,
    hubModule,
    invisibleTests,
    duplicatedOrchestration,
    semanticModulePlacementAdvice
  )

  const architectureExploreDerive = (signals: ReadonlyArray<Signal>): ReadonlyArray<Advice> => {
    const namedElements = Array.flatMap(signals, nameArchitectureExploreDetections)
    const adviceGroups = Array.map(architectureExploreAdvisers, (adviser) => adviser(namedElements))

    return Array.flatten(adviceGroups)
  }

  const makeArchitectureExploreWiring = (
    fleetPolicies: ReadonlyArray<Policy>,
    catalogInputs: ReadonlyArray<SemanticModuleHardBondRuleCatalog>
  ) => {
    const policies = makeArchitectureExplorePolicies(fleetPolicies, catalogInputs)

    return makeWiring({
      policies,
      derive: architectureExploreDerive
    })
  }

  class ArchitectureExploreExports extends Data.Class<{
    readonly bounceClusterExamples: typeof bounceClusterExamples
    readonly bounceCluster: typeof bounceCluster
    readonly deletionTestShallownessExamples: typeof deletionTestShallownessExamples
    readonly deletionTestShallowness: typeof deletionTestShallowness
    readonly duplicatedOrchestrationExamples: typeof duplicatedOrchestrationExamples
    readonly duplicatedOrchestration: typeof duplicatedOrchestration
    readonly hardToTestHotspotExamples: typeof hardToTestHotspotExamples
    readonly hardToTestHotspot: typeof hardToTestHotspot
    readonly hubModuleExamples: typeof hubModuleExamples
    readonly hubModule: typeof hubModule
    readonly hypotheticalSeamExamples: typeof hypotheticalSeamExamples
    readonly hypotheticalSeam: typeof hypotheticalSeam
    readonly invisibleTests: typeof invisibleTests
    readonly leakedSeamExamples: typeof leakedSeamExamples
    readonly leakedSeam: typeof leakedSeam
    readonly registrationCeremonyExamples: typeof registrationCeremonyExamples
    readonly registrationCeremony: typeof registrationCeremony
    readonly testPastInterfaceExamples: typeof testPastInterfaceExamples
    readonly testPastInterface: typeof testPastInterface
    readonly wideShallowInterfaceExamples: typeof wideShallowInterfaceExamples
    readonly wideShallowInterface: typeof wideShallowInterface
    readonly semanticModulePlacementName: typeof semanticModulePlacementName
    readonly semanticModulePlacementAdvice: typeof semanticModulePlacementAdvice
    readonly architectureExploreAdvisers: typeof architectureExploreAdvisers
    readonly architectureExploreDerive: typeof architectureExploreDerive
    readonly makeArchitectureExploreWiring: typeof makeArchitectureExploreWiring
  }> {}

  const architectureExploreExports = new ArchitectureExploreExports({
    bounceClusterExamples,
    bounceCluster,
    deletionTestShallownessExamples,
    deletionTestShallowness,
    duplicatedOrchestrationExamples,
    duplicatedOrchestration,
    hardToTestHotspotExamples,
    hardToTestHotspot,
    hubModuleExamples,
    hubModule,
    hypotheticalSeamExamples,
    hypotheticalSeam,
    invisibleTests,
    leakedSeamExamples,
    leakedSeam,
    registrationCeremonyExamples,
    registrationCeremony,
    testPastInterfaceExamples,
    testPastInterface,
    wideShallowInterfaceExamples,
    wideShallowInterface,
    semanticModulePlacementName,
    semanticModulePlacementAdvice,
    architectureExploreAdvisers,
    architectureExploreDerive,
    makeArchitectureExploreWiring
  })

  return architectureExploreExports
}

export const {
  bounceClusterExamples,
  bounceCluster,
  deletionTestShallownessExamples,
  deletionTestShallowness,
  duplicatedOrchestrationExamples,
  duplicatedOrchestration,
  hardToTestHotspotExamples,
  hardToTestHotspot,
  hubModuleExamples,
  hubModule,
  hypotheticalSeamExamples,
  hypotheticalSeam,
  invisibleTests,
  leakedSeamExamples,
  leakedSeam,
  registrationCeremonyExamples,
  registrationCeremony,
  testPastInterfaceExamples,
  testPastInterface,
  wideShallowInterfaceExamples,
  wideShallowInterface,
  semanticModulePlacementName,
  semanticModulePlacementAdvice,
  architectureExploreAdvisers,
  architectureExploreDerive,
  makeArchitectureExploreWiring
} = makeArchitectureExploreExports()
