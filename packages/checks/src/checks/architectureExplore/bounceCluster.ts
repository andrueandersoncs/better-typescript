import { Array, Data, Function, Option, pipe } from "effect"
import { Advice } from "@better-typescript/core/engine/derive/data"
import { adviceLocation, deriveSignals, evidenceItem } from "@better-typescript/core/engine/derive"
import type { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { isDeletableWrapper, moduleGraphDataOf } from "./evidence.js"

const minimumThinFiles = 3

/**
 * GraphEdge is the path pair shared by connected-component traversal.
 *
 * @modelRole shared @remarks It remains explicit because neighbor lookup,
 * reachability, and component assembly must exchange the same normalized edge;
 * removing it would spread positional path pairs across all three operations.
 */
class GraphEdge extends Data.Class<{
  readonly from: string
  readonly to: string
}> {}

const neighborsOf = (edges: ReadonlyArray<GraphEdge>, path: string): ReadonlyArray<string> =>
  pipe(
    edges,
    Array.flatMap((edge) => {
      if (edge.from === path) {
        return Array.of(edge.to)
      }

      return edge.to === path ? Array.of(edge.from) : Array.empty()
    }),
    Array.dedupe
  )

const reachable = (
  edges: ReadonlyArray<GraphEdge>,
  frontier: ReadonlyArray<string>,
  visited: ReadonlyArray<string>
): ReadonlyArray<string> => {
  const visit = (next: string): ReadonlyArray<string> => {
    const remaining = Array.drop(frontier, 1)

    if (Array.contains(visited, next)) {
      return reachable(edges, remaining, visited)
    }

    const neighbors = pipe(
      neighborsOf(edges, next),
      Array.filter((candidate) => !Array.contains(visited, candidate))
    )

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
  edges: ReadonlyArray<GraphEdge>
): ReadonlyArray<ReadonlyArray<string>> => {
  const collect = (
    remaining: ReadonlyArray<string>,
    components: ReadonlyArray<ReadonlyArray<string>>
  ): ReadonlyArray<ReadonlyArray<string>> => {
    const collectSeed = (seed: string): ReadonlyArray<ReadonlyArray<string>> => {
      const frontier = Array.of(seed)
      const visited = Array.empty<string>()
      const component = reachable(edges, frontier, visited)

      const rest = Array.filter(remaining, (path) => !Array.contains(component, path))

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

const directorySegments = (filePath: string): ReadonlyArray<string> => {
  const normalized = filePath.replaceAll("\\", "/")
  const separator = normalized.lastIndexOf("/")
  const directory = separator === -1 ? "." : normalized.slice(0, separator)

  return directory.split("/")
}

const commonDirectory = (paths: ReadonlyArray<string>): string => {
  const allSegments = Array.map(paths, directorySegments)
  const fallback = Array.of(".")

  const first = pipe(Array.head(allSegments), Option.getOrElse(Function.constant(fallback)))

  const remaining = Array.drop(allSegments, 1)

  const common = Array.reduce(remaining, first, (prefix, segments) =>
    Array.takeWhile(prefix, (segment, index) => segments[index] === segment)
  )

  return common.length === 0 ? "." : Array.join(common, "/")
}

const bounceAdvice = (elements: ReadonlyArray<NamedDetection>): ReadonlyArray<Advice> => {
  const shallowPaths = pipe(
    elements,
    Array.filter((element) => element.name === "pass-through-wrappers"),
    Array.filter(isDeletableWrapper),
    Array.map((element) => element.detection.location.path),
    Array.dedupe
  )

  const graphElements = Array.filter(elements, (element) => element.name === "module-graph")

  const edges = Array.flatMap(graphElements, (element) => {
    const from = element.detection.location.path

    return pipe(
      moduleGraphDataOf(element),
      Option.map((data) =>
        pipe(
          data.importedPaths,
          Array.filter((to) => {
            const fromIsShallow = Array.contains(shallowPaths, from)
            const toIsShallow = Array.contains(shallowPaths, to)

            return fromIsShallow && toIsShallow
          }),
          Array.map((to) => new GraphEdge({ from, to }))
        )
      ),
      Option.getOrElse(Array.empty)
    )
  })

  const components = pipe(
    connectedComponents(shallowPaths, edges),
    Array.filter((component) => component.length >= minimumThinFiles),
    Array.filter((component) =>
      Array.some(edges, (edge) => {
        const containsFrom = Array.contains(component, edge.from)
        const containsTo = Array.contains(component, edge.to)

        return containsFrom && containsTo
      })
    )
  )

  return Array.map(components, (component) => {
    const edgeCount = Array.filter(edges, (edge) => {
      const containsFrom = Array.contains(component, edge.from)
      const containsTo = Array.contains(component, edge.to)

      return containsFrom && containsTo
    }).length

    const directory = commonDirectory(component)
    const location = adviceLocation(directory)
    const thinModulesItem = evidenceItem("thin-modules", component.length)
    const moduleEdgesItem = evidenceItem("module-edges", edgeCount)
    const evidence = Array.make(thinModulesItem, moduleEdgesItem)

    return new Advice({
      location,
      level: "directory",
      title: "bounce cluster",
      remediation:
        "Understanding one flow requires traversing connected low-leverage forwarding Modules. " +
        "Collapse this import path behind one deeper interface so policy and verification become local.",
      evidence
    })
  })
}

export const bounceCluster = deriveSignals(bounceAdvice)
