import { Array, Option, Tuple, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  makeAdviceLocation,
  deriveSignals,
  makeEvidenceItem
} from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { packageExamples } from "../../defineCheck.js"
import {
  commonDirectory,
  isDeletableShallowness,
  isShallownessName,
  moduleGraphDataOf
} from "./evidence.js"
import type { ModuleGraphData } from "./data.js"
import { moduleGraphName } from "./names.js"

export const bounceClusterExamples = packageExamples("bounce-cluster")

const minimumThinFiles = 3

const neighborsOf = (
  edges: ReadonlyArray<readonly [string, string]>,
  path: string
): ReadonlyArray<string> =>
  pipe(
    edges,
    Array.flatMap((edge) => {
      if (edge[0] === path) {
        return Array.of(edge[1])
      }

      return edge[1] === path ? Array.of(edge[0]) : Array.empty()
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
  const detectionPath = (element: NamedDetection) => element.detection.location.path
  const elementHasShallownessName = (element: NamedDetection) => isShallownessName(element.name)

  const shallowPaths = pipe(
    elements,
    Array.filter(elementHasShallownessName),
    Array.filter(isDeletableShallowness),
    Array.map(detectionPath),
    Array.dedupe
  )

  const isModuleGraphElement = (element: NamedDetection) => element.name === moduleGraphName
  const graphElements = Array.filter(elements, isModuleGraphElement)

  const edges = Array.flatMap(graphElements, (element) => {
    const from = element.detection.location.path
    const pairWithFrom = (to: string) => Tuple.make(from, to)

    const isShallowTarget = (to: string) => {
      const fromIsShallow = Array.contains(shallowPaths, from)
      const toIsShallow = Array.contains(shallowPaths, to)

      return fromIsShallow && toIsShallow
    }

    const shallowEdgesFrom = (data: ModuleGraphData) =>
      pipe(data.importedPaths, Array.filter(isShallowTarget), Array.map(pairWithFrom))

    return pipe(
      moduleGraphDataOf(element),
      Option.map(shallowEdgesFrom),
      Option.getOrElse(Array.empty)
    )
  })

  const hasMinimumThinFiles = (component: ReadonlyArray<string>) =>
    component.length >= minimumThinFiles

  const hasInternalEdge = (component: ReadonlyArray<string>) =>
    Array.some(edges, (edge) => {
      const containsFrom = Array.contains(component, edge[0])
      const containsTo = Array.contains(component, edge[1])

      return containsFrom && containsTo
    })

  const components = pipe(
    connectedComponents(shallowPaths, edges),
    Array.filter(hasMinimumThinFiles),
    Array.filter(hasInternalEdge)
  )

  return Array.map(components, (component) => {
    const edgeCount = Array.countBy(edges, (edge) => {
      const containsFrom = Array.contains(component, edge[0])
      const containsTo = Array.contains(component, edge[1])

      return containsFrom && containsTo
    })

    const directory = commonDirectory(component)
    const location = makeAdviceLocation(directory)
    const thinModulesItem = makeEvidenceItem("thin-modules", component.length)
    const moduleEdgesItem = makeEvidenceItem("module-edges", edgeCount)
    const evidence = Array.make(thinModulesItem, moduleEdgesItem)
    const examples = bounceClusterExamples

    return Advice.make({
      location,
      level: "directory",
      title: "bounce cluster",
      remediation:
        "Understanding one flow requires traversing connected low-leverage forwarding Modules. " +
        "Collapse this import path behind one deeper interface so policy and verification become local.",
      evidence,
      examples
    })
  })
}

export const bounceCluster = deriveSignals(bounceAdvice)
