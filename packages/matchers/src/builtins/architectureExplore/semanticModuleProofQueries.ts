import { Array, Function, HashMap, Option, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { SemanticModuleBondKey } from "./semanticModuleBondKey.js"
import { SemanticModuleRecord } from "./semanticModuleRecord.js"
import { SemanticModuleMembershipProofStep } from "./semanticModuleMembershipProofStep.js"
import { SemanticModuleSnapshotV1 } from "./semanticModuleSnapshotV1.js"
import { entityKeyEquivalence } from "./entityKeyEquivalence.js"
import { emptyProofValues } from "./emptyProofValues.js"
import { freezeBondKey } from "./freezeBondKey.js"
import { entityKeyToken } from "./entityKeyToken.js"
import { containsEntity } from "./containsEntity.js"
import { ForestEdge } from "./forestEdge.js"
import { ProofQueueItem } from "./proofQueueItem.js"
import { ProofSearchState } from "./proofSearchState.js"

export const emptyProof = Object.freeze(emptyProofValues)

export const freezeProofStep = (step: SemanticModuleMembershipProofStep) => {
  freezeBondKey(step.bondKey)
  return Object.freeze(step)
}

const appendForestEdge =
  (from: SemanticModuleEntityKey, edge: ForestEdge) =>
  (adjacency: HashMap.HashMap<string, ReadonlyArray<ForestEdge>>) => {
    const token = entityKeyToken(from)
    const existing = pipe(HashMap.get(adjacency, token), Option.getOrElse(Array.empty))
    const nextEdges = Array.append(existing, edge)
    return HashMap.set(adjacency, token, nextEdges)
  }

const makeForwardEdge = (bondKey: SemanticModuleBondKey) => {
  const step = SemanticModuleMembershipProofStep.make({ bondKey, direction: "forward" })
  return new ForestEdge({
    neighbor: bondKey.right,
    step
  })
}

const makeReverseEdge = (bondKey: SemanticModuleBondKey) => {
  const step = SemanticModuleMembershipProofStep.make({ bondKey, direction: "reverse" })
  return new ForestEdge({
    neighbor: bondKey.left,
    step
  })
}

const addBondEdges =
  (bondKey: SemanticModuleBondKey) =>
  (adjacency: HashMap.HashMap<string, ReadonlyArray<ForestEdge>>) => {
    const forward = makeForwardEdge(bondKey)
    const reverse = makeReverseEdge(bondKey)
    const withForward = appendForestEdge(bondKey.left, forward)(adjacency)
    return appendForestEdge(bondKey.right, reverse)(withForward)
  }

const emptyForestAdjacency = HashMap.empty<string, ReadonlyArray<ForestEdge>>()

export const forestAdjacency = (forestBondKeys: ReadonlyArray<SemanticModuleBondKey>) =>
  Array.reduce(forestBondKeys, emptyForestAdjacency, (adjacency, bondKey) =>
    addBondEdges(bondKey)(adjacency)
  )

const freezeProofSteps = Array.map(freezeProofStep)

const freezePathSteps = (
  steps: ReadonlyArray<SemanticModuleMembershipProofStep>
): ReadonlyArray<SemanticModuleMembershipProofStep> => {
  const frozen = Object.freeze(steps)
  return frozen
}

const frozenProofPath = Function.flow(freezeProofSteps, freezePathSteps)

const makeGoalReachedState =
  (current: ProofQueueItem) =>
  (remainingQueue: ReadonlyArray<ProofQueueItem>) =>
  (visited: ProofSearchState["visited"]) => {
    const goalPath = frozenProofPath(current.path)
    const result = Option.some<ReadonlyArray<SemanticModuleMembershipProofStep>>(goalPath)
    return new ProofSearchState({
      queue: remainingQueue,
      visited,
      result
    })
  }

const withNeighborQueued =
  (currentPath: ReadonlyArray<SemanticModuleMembershipProofStep>) =>
  (edge: ForestEdge) =>
  (state: ProofSearchState) => {
    const neighborToken = entityKeyToken(edge.neighbor)
    if (HashMap.has(state.visited, neighborToken)) {
      return state
    }
    const nextPath = Array.append(currentPath, edge.step)

    const queueItem = new ProofQueueItem({
      token: neighborToken,
      path: nextPath
    })

    const queue = Array.append(state.queue, queueItem)
    const visited = HashMap.set(state.visited, neighborToken, true as const)

    return new ProofSearchState({
      queue,
      visited,
      result: state.result
    })
  }

const expandProofEdges =
  (adjacency: HashMap.HashMap<string, ReadonlyArray<ForestEdge>>) =>
  (goalToken: string) =>
  (state: ProofSearchState): ProofSearchState => {
    const hasResult = Option.isSome(state.result)
    if (hasResult) {
      return state
    }
    const queueEmpty = strictEqual(0)(state.queue.length)
    if (queueEmpty) {
      return state
    }
    const queueHead = Array.head(state.queue)
    const current = Option.getOrThrow(queueHead)
    const remainingQueue = Array.drop(state.queue, 1)
    if (strictEqual(current.token)(goalToken)) {
      return makeGoalReachedState(current)(remainingQueue)(state.visited)
    }
    const edges = pipe(HashMap.get(adjacency, current.token), Option.getOrElse(Array.empty))
    const pendingResult = Option.none<ReadonlyArray<SemanticModuleMembershipProofStep>>()

    const pending = new ProofSearchState({
      queue: remainingQueue,
      visited: state.visited,
      result: pendingResult
    })

    const withNeighbors = Array.reduce(edges, pending, (currentState, edge) =>
      withNeighborQueued(current.path)(edge)(currentState)
    )

    return expandProofEdges(adjacency)(goalToken)(withNeighbors)
  }

const makeInitialProofSearch = (startToken: string) => {
  const startItem = new ProofQueueItem({ token: startToken, path: emptyProofValues })
  const startQueue = Array.of(startItem)
  const emptyVisited = HashMap.empty<string, true>()
  const startVisited = HashMap.set(emptyVisited, startToken, true)
  const initialResult = Option.none<ReadonlyArray<SemanticModuleMembershipProofStep>>()

  return new ProofSearchState({
    queue: startQueue,
    visited: startVisited,
    result: initialResult
  })
}

const runProofSearch = (
  adjacency: HashMap.HashMap<string, ReadonlyArray<ForestEdge>>,
  startToken: string,
  goalToken: string
) => {
  const initial = makeInitialProofSearch(startToken)
  const expanded = expandProofEdges(adjacency)(goalToken)(initial)
  return expanded.result
}

export const proofPath = (
  module: SemanticModuleRecord,
  left: SemanticModuleEntityKey,
  right: SemanticModuleEntityKey
) => {
  if (entityKeyEquivalence(left, right)) {
    return Option.some(emptyProof)
  }
  const adjacency = forestAdjacency(module.forestBondKeys)
  const startToken = entityKeyToken(left)
  const goalToken = entityKeyToken(right)
  return runProofSearch(adjacency, startToken, goalToken)
}

export const moduleFor = Function.dual<
  (
    key: SemanticModuleEntityKey
  ) => (snapshot: SemanticModuleSnapshotV1) => Option.Option<SemanticModuleRecord>,
  (
    snapshot: SemanticModuleSnapshotV1,
    key: SemanticModuleEntityKey
  ) => Option.Option<SemanticModuleRecord>
>(2, (snapshot, key) => pipe(snapshot.modules, Array.findFirst(containsEntity(key))))

export const proofBetween = Function.dual<
  (
    left: SemanticModuleEntityKey,
    right: SemanticModuleEntityKey
  ) => (
    snapshot: SemanticModuleSnapshotV1
  ) => Option.Option<ReadonlyArray<SemanticModuleMembershipProofStep>>,
  (
    snapshot: SemanticModuleSnapshotV1,
    left: SemanticModuleEntityKey,
    right: SemanticModuleEntityKey
  ) => Option.Option<ReadonlyArray<SemanticModuleMembershipProofStep>>
>(3, (snapshot, left, right) =>
  pipe(
    snapshot,
    moduleFor(left),
    Option.filter(containsEntity(right)),
    Option.flatMap((moduleRecord) => {
      const path = proofPath(moduleRecord, left, right)
      return path
    })
  )
)
