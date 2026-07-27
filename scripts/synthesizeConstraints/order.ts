import {
  Array,
  Equal,
  Equivalence,
  Function,
  HashMap,
  HashSet,
  Option,
  Order,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import { Definition, Ordering } from "./data.ts"

const strictEqualNumber = Equivalence.strictEqual<number>()
const emptyIndices = Array.empty<number>()
const emptyStrings = Array.empty<string>()
const emptyCycles = Array.empty<ReadonlyArray<string>>()
const emptyDefinitions = Array.empty<Definition>()
const emptyPlaced = HashSet.empty<number>()
const emptyReachable = HashSet.empty<number>()
const emptyComponentKeys = HashSet.empty<string>()
const emptyComponents = Array.empty<ReadonlyArray<number>>()
const missingTerm = Function.constant("")
const noIndices = Function.constant(emptyIndices)
const noReachable = Function.constant(emptyReachable)
const zeroIndex = Function.constant(0)

const glossaryTerm = (definition: Definition) => Struct.get(definition, "term")

const foldTermKey = (term: string) => term.toLowerCase()

const termPositionEntry = (definition: Definition, index: number) => {
  const key = foldTermKey(definition.term)

  return Tuple.make(key, index)
}

// makeTermPositions keys by case-fold because dependsOn matching is case-insensitive.
const makeTermPositions: (
  definitions: ReadonlyArray<Definition>
) => HashMap.HashMap<string, number> = flow(Array.map(termPositionEntry), HashMap.fromIterable)

const positionOfTerm = (positions: HashMap.HashMap<string, number>, term: string) => {
  const key = foldTermKey(term)

  return HashMap.get(positions, key)
}

const lookupPosition = (positions: HashMap.HashMap<string, number>) => (term: string) =>
  positionOfTerm(positions, term)

const prerequisitesOf = (
  definition: Definition,
  positions: HashMap.HashMap<string, number>
): ReadonlyArray<number> => {
  const lookup = lookupPosition(positions)
  const options = Array.map(definition.dependsOn, lookup)
  const known = Array.getSomes(options)
  const unique = Array.dedupe(known)

  return Array.sort(unique, Order.Number)
}

const edgesOf = (positions: HashMap.HashMap<string, number>) => (definition: Definition) =>
  prerequisitesOf(definition, positions)

// prerequisiteEdges list each entry's prerequisites because topological order places those first.
const prerequisiteEdges = (
  definitions: ReadonlyArray<Definition>,
  positions: HashMap.HashMap<string, number>
) => Array.map(definitions, edgesOf(positions))

const definitionIndices = (definitions: ReadonlyArray<Definition>) => {
  const count = definitions.length
  const hasDefinitions = count > 0

  if (!hasDefinitions) {
    return emptyIndices
  }

  const lastIndex = count - 1

  return Array.range(0, lastIndex)
}

const prerequisitesAt = (edges: ReadonlyArray<ReadonlyArray<number>>, index: number) =>
  pipe(Array.get(edges, index), Option.getOrElse(noIndices))

const isPlaced = (placed: HashSet.HashSet<number>, index: number) => HashSet.has(placed, index)

const isUnplaced = (placed: HashSet.HashSet<number>, index: number) => {
  const placedIndex = isPlaced(placed, index)

  return !placedIndex
}

const unplacedIn = (placed: HashSet.HashSet<number>) => (index: number) => isUnplaced(placed, index)

const prerequisiteIsPlaced = (placed: HashSet.HashSet<number>) => (prerequisite: number) =>
  HashSet.has(placed, prerequisite)

const isReadyIndex =
  (edges: ReadonlyArray<ReadonlyArray<number>>, placed: HashSet.HashSet<number>) =>
  (index: number) => {
    const unplaced = isUnplaced(placed, index)
    const prerequisites = prerequisitesAt(edges, index)
    const ready = Array.every(prerequisites, prerequisiteIsPlaced(placed))
    const conditions = Array.make(unplaced, ready)

    return Array.every(conditions, Boolean)
  }

const nextReadyIndex = (
  edges: ReadonlyArray<ReadonlyArray<number>>,
  placed: HashSet.HashSet<number>,
  indices: ReadonlyArray<number>
) => Array.findFirst(indices, isReadyIndex(edges, placed))

const placeIndex = (
  order: ReadonlyArray<number>,
  placed: HashSet.HashSet<number>,
  index: number
) => {
  const nextOrder = Array.append(order, index)
  const nextPlaced = HashSet.add(placed, index)

  return Tuple.make(nextOrder, nextPlaced)
}

const continueTopologicalOrder = (
  edges: ReadonlyArray<ReadonlyArray<number>>,
  indices: ReadonlyArray<number>,
  order: ReadonlyArray<number>,
  placed: HashSet.HashSet<number>
): ReadonlyArray<number> => {
  const maybeNext = nextReadyIndex(edges, placed, indices)
  const finish = Function.constant(order)

  const placeNext = (index: number) => {
    const placedState = placeIndex(order, placed, index)
    const nextOrder = Tuple.get(placedState, 0)
    const nextPlaced = Tuple.get(placedState, 1)

    return continueTopologicalOrder(edges, indices, nextOrder, nextPlaced)
  }

  return pipe(
    maybeNext,
    Option.match({
      onNone: finish,
      onSome: placeNext
    })
  )
}

// topologicalOrder keeps lowest-index ties because the agent sequence survives when permitted.
const topologicalOrder = (
  edges: ReadonlyArray<ReadonlyArray<number>>,
  indices: ReadonlyArray<number>
) => continueTopologicalOrder(edges, indices, emptyIndices, emptyPlaced)

const seedReachable = (index: number, prerequisites: ReadonlyArray<number>) => {
  const direct = HashSet.fromIterable(prerequisites)

  return Tuple.make(index, direct)
}

const seedAt = (edges: ReadonlyArray<ReadonlyArray<number>>) => (index: number) => {
  const prerequisites = prerequisitesAt(edges, index)

  return seedReachable(index, prerequisites)
}

const seedReachability = (
  edges: ReadonlyArray<ReadonlyArray<number>>,
  indices: ReadonlyArray<number>
) => pipe(indices, Array.map(seedAt(edges)), HashMap.fromIterable)

const reachableOf = (
  reachability: HashMap.HashMap<number, HashSet.HashSet<number>>,
  index: number
) => pipe(HashMap.get(reachability, index), Option.getOrElse(noReachable))

const expandThrough =
  (reachability: HashMap.HashMap<number, HashSet.HashSet<number>>) =>
  (reachable: HashSet.HashSet<number>, next: number) => {
    const throughNext = reachableOf(reachability, next)

    return HashSet.union(reachable, throughNext)
  }

const expandReachable = (
  reachability: HashMap.HashMap<number, HashSet.HashSet<number>>,
  direct: HashSet.HashSet<number>
) => {
  const neighbors = Array.fromIterable(direct)

  return Array.reduce(neighbors, direct, expandThrough(reachability))
}

const expandEntry =
  (reachability: HashMap.HashMap<number, HashSet.HashSet<number>>) =>
  (entry: readonly [number, HashSet.HashSet<number>]) => {
    const index = Tuple.get(entry, 0)
    const direct = Tuple.get(entry, 1)
    const expanded = expandReachable(reachability, direct)

    return Tuple.make(index, expanded)
  }

const expandReachability = (reachability: HashMap.HashMap<number, HashSet.HashSet<number>>) => {
  const entries = HashMap.toEntries(reachability)
  const expanded = Array.map(entries, expandEntry(reachability))

  return HashMap.fromIterable(expanded)
}

const continueReachabilityFixpoint = (
  reachability: HashMap.HashMap<number, HashSet.HashSet<number>>
): HashMap.HashMap<number, HashSet.HashSet<number>> => {
  const expanded = expandReachability(reachability)
  const stable = Equal.equals(expanded, reachability)

  return stable ? reachability : continueReachabilityFixpoint(expanded)
}

// reachabilityFixpoint is cubic because Tarjan needs mutable state the house style bans.
const reachabilityFixpoint = (
  edges: ReadonlyArray<ReadonlyArray<number>>,
  indices: ReadonlyArray<number>
) => pipe(seedReachability(edges, indices), continueReachabilityFixpoint)

const reaches = (
  reachability: HashMap.HashMap<number, HashSet.HashSet<number>>,
  from: number,
  to: number
) => {
  const reachable = reachableOf(reachability, from)

  return HashSet.has(reachable, to)
}

const mutuallyReach = (
  reachability: HashMap.HashMap<number, HashSet.HashSet<number>>,
  left: number,
  right: number
) => {
  const leftReachesRight = reaches(reachability, left, right)
  const rightReachesLeft = reaches(reachability, right, left)
  const conditions = Array.make(leftReachesRight, rightReachesLeft)

  return Array.every(conditions, Boolean)
}

const isSameComponent =
  (reachability: HashMap.HashMap<number, HashSet.HashSet<number>>, vertex: number) =>
  (candidate: number) => {
    const sameVertex = strictEqualNumber(candidate, vertex)
    const mutual = mutuallyReach(reachability, vertex, candidate)
    const conditions = Array.make(sameVertex, mutual)

    return Array.some(conditions, Boolean)
  }

const componentOf = (
  reachability: HashMap.HashMap<number, HashSet.HashSet<number>>,
  indices: ReadonlyArray<number>,
  vertex: number
) => {
  const members = Array.filter(indices, isSameComponent(reachability, vertex))

  return Array.sort(members, Order.Number)
}

const componentKey = (component: ReadonlyArray<number>) => {
  const texts = Array.map(component, String)

  return Array.join(texts, ",")
}

const makeComponentAccumulation = (
  seen: HashSet.HashSet<string>,
  components: ReadonlyArray<ReadonlyArray<number>>,
  component: ReadonlyArray<number>
) => {
  const key = componentKey(component)
  const alreadySeen = HashSet.has(seen, key)

  if (alreadySeen) {
    return Tuple.make(seen, components)
  }

  const nextSeen = HashSet.add(seen, key)
  const nextComponents = Array.append(components, component)

  return Tuple.make(nextSeen, nextComponents)
}

const makeComponentFoldStep =
  (
    reachability: HashMap.HashMap<number, HashSet.HashSet<number>>,
    indices: ReadonlyArray<number>
  ) =>
  (
    state: readonly [HashSet.HashSet<string>, ReadonlyArray<ReadonlyArray<number>>],
    vertex: number
  ) => {
    const seen = Tuple.get(state, 0)
    const components = Tuple.get(state, 1)
    const component = componentOf(reachability, indices, vertex)

    return makeComponentAccumulation(seen, components, component)
  }

const collectComponents = (
  reachability: HashMap.HashMap<number, HashSet.HashSet<number>>,
  indices: ReadonlyArray<number>
) => {
  const initial = Tuple.make(emptyComponentKeys, emptyComponents)
  const collected = Array.reduce(indices, initial, makeComponentFoldStep(reachability, indices))

  return Tuple.get(collected, 1)
}

const hasSelfEdge = (edges: ReadonlyArray<ReadonlyArray<number>>, vertex: number) => {
  const prerequisites = prerequisitesAt(edges, vertex)

  return Array.contains(prerequisites, vertex)
}

const componentHead = (component: ReadonlyArray<number>) =>
  pipe(Array.head(component), Option.getOrElse(zeroIndex))

const isReportableComponent =
  (edges: ReadonlyArray<ReadonlyArray<number>>) => (component: ReadonlyArray<number>) => {
    const multiVertex = component.length > 1
    const vertex = componentHead(component)
    const selfEdge = hasSelfEdge(edges, vertex)
    const conditions = Array.make(multiVertex, selfEdge)

    return Array.some(conditions, Boolean)
  }

// stronglyConnected keeps sorted components because audits name cycles by stable term order.
const stronglyConnected = (
  edges: ReadonlyArray<ReadonlyArray<number>>,
  indices: ReadonlyArray<number>
) => {
  const reachability = reachabilityFixpoint(edges, indices)
  const components = collectComponents(reachability, indices)

  return Array.filter(components, isReportableComponent(edges))
}

const isUnknownReference = (positions: HashMap.HashMap<string, number>) => (term: string) => {
  const key = foldTermKey(term)
  const known = HashMap.has(positions, key)

  return !known
}

const unknownReferencesOf =
  (positions: HashMap.HashMap<string, number>) => (definition: Definition) =>
    Array.filter(definition.dependsOn, isUnknownReference(positions))

const collectUnknownReferences = (
  definitions: ReadonlyArray<Definition>,
  positions: HashMap.HashMap<string, number>
) => {
  const nested = Array.map(definitions, unknownReferencesOf(positions))
  const flat = Array.flatten(nested)
  const unique = Array.dedupe(flat)

  return Array.sort(unique, Order.String)
}

const residualIndices = (indices: ReadonlyArray<number>, order: ReadonlyArray<number>) => {
  const placed = HashSet.fromIterable(order)

  return Array.filter(indices, unplacedIn(placed))
}

const definitionAt = (definitions: ReadonlyArray<Definition>) => (index: number) =>
  Array.get(definitions, index)

const termAt = (definitions: ReadonlyArray<Definition>) => (index: number) => {
  const maybeDefinition = Array.get(definitions, index)
  const maybeTerm = Option.map(maybeDefinition, glossaryTerm)

  return pipe(maybeTerm, Option.getOrElse(missingTerm))
}

const namedComponent =
  (definitions: ReadonlyArray<Definition>) => (component: ReadonlyArray<number>) =>
    Array.map(component, termAt(definitions))

const orderedDefinitions = (
  definitions: ReadonlyArray<Definition>,
  order: ReadonlyArray<number>,
  residual: ReadonlyArray<number>
) => {
  // Unplaced cyclic entries trail in index order because the audit still needs real text to cite.
  const sequence = Array.appendAll(order, residual)
  const options = Array.map(sequence, definitionAt(definitions))

  return Array.getSomes(options)
}

const namedCycles = (
  definitions: ReadonlyArray<Definition>,
  edges: ReadonlyArray<ReadonlyArray<number>>,
  indices: ReadonlyArray<number>
) => {
  const components = stronglyConnected(edges, indices)

  return Array.map(components, namedComponent(definitions))
}

const emptyOrdering = Ordering.make({
  definitions: emptyDefinitions,
  cycles: emptyCycles,
  unknownReferences: emptyStrings
})

// orderDefinitions sequences the glossary because rendering and auditing both need one order.
export const orderDefinitions = (definitions: ReadonlyArray<Definition>): Ordering => {
  const count = definitions.length
  const hasDefinitions = count > 0

  if (!hasDefinitions) {
    return emptyOrdering
  }

  const positions = makeTermPositions(definitions)
  const edges = prerequisiteEdges(definitions, positions)
  const indices = definitionIndices(definitions)
  const order = topologicalOrder(edges, indices)
  const residual = residualIndices(indices, order)
  const ordered = orderedDefinitions(definitions, order, residual)
  const cycles = namedCycles(definitions, edges, indices)
  const unknownReferences = collectUnknownReferences(definitions, positions)

  return Ordering.make({
    definitions: ordered,
    cycles,
    unknownReferences
  })
}
