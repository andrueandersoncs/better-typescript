import {
  Array,
  Data,
  Function,
  Option,
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
import { makePackageExamples } from "../makePackageExamples.js"
import { ModuleGraphData } from "@better-typescript/matchers/builtins/moduleGraph"
import { InterfaceBurdenData } from "@better-typescript/matchers/builtins/interfaceBurdenData"
import { CompositionFingerprintData } from "@better-typescript/matchers/builtins/compositionFingerprints"
import { CompositionForwarderData } from "@better-typescript/matchers/builtins/compositionForwarders"
import { PassThroughWrapperData } from "@better-typescript/matchers/builtins/passThroughWrappers"
import { architectureExploreCorePolicies } from "../preset/architectureExploreCorePolicies.js"
import { compositionFingerprints as compositionFingerprintsPolicy } from "../preset/compositionFingerprints.js"
import { compositionForwarders as compositionForwardersPolicy } from "../preset/compositionForwarders.js"

const makeArchitectureExploreModuleShapeAdvisers = () => {
  const [passThroughWrappersPolicy, interfaceBurdenPolicy, moduleGraphPolicy] =
    architectureExploreCorePolicies

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

  const passThroughIsDeletable = (data: PassThroughWrapperData) => {
    const hasAtMostOneCaller = data.callerCount <= 1
    const hasOnlyCallReferences = !data.hasNonCallReference

    return hasAtMostOneCaller && hasOnlyCallReferences
  }

  const isDeletableWrapper = (element: NamedDetection) =>
    pipe(passThroughDataOf(element), Option.exists(passThroughIsDeletable))

  const compositionForwarderDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(CompositionForwarderData), element)

  const compositionFingerprintDataOf = (element: NamedDetection) =>
    deriveCheckedData(Schema.is(CompositionFingerprintData), element)

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

  // ModuleShapeAdvisers keeps direct exports together because they share shallowness evidence.
  class ModuleShapeAdvisers extends Data.Class<{
    readonly bounceClusterExamples: typeof bounceClusterExamples
    readonly bounceCluster: typeof bounceCluster
    readonly deletionTestShallownessExamples: typeof deletionTestShallownessExamples
    readonly deletionTestShallowness: typeof deletionTestShallowness
    readonly duplicatedOrchestrationExamples: typeof duplicatedOrchestrationExamples
    readonly duplicatedOrchestration: typeof duplicatedOrchestration
    readonly wideShallowInterfaceExamples: typeof wideShallowInterfaceExamples
    readonly wideShallowInterface: typeof wideShallowInterface
  }> {}

  return new ModuleShapeAdvisers({
    bounceClusterExamples,
    bounceCluster,
    deletionTestShallownessExamples,
    deletionTestShallowness,
    duplicatedOrchestrationExamples,
    duplicatedOrchestration,
    wideShallowInterfaceExamples,
    wideShallowInterface
  })
}

export const {
  bounceClusterExamples,
  bounceCluster,
  deletionTestShallownessExamples,
  deletionTestShallowness,
  duplicatedOrchestrationExamples,
  duplicatedOrchestration,
  wideShallowInterfaceExamples,
  wideShallowInterface
} = makeArchitectureExploreModuleShapeAdvisers()
