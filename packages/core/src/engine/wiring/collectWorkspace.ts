import { Array, HashMap, MutableList, Option, Result, Tuple, pipe } from "effect"
import { WorkspaceContext } from "@better-typescript/matchers/matcher/data"
import { toWorkspacePolicies } from "../policy/policy.js"
import type { WorkspacePolicy } from "../policy/data.js"
import { Signal, WiringSignals } from "../signal/data.js"
import { isWorkspacePolicy, type WiringPolicy } from "./data.js"
import type { WiringConfig, WiringEntry } from "./data.js"
import {
  appendDetection,
  noDetections,
  storageForSlot,
  type MutableElementBuckets,
  type MutableSeenBuckets
} from "./collectBuckets.js"
import type { MutableWorkspaceFiles } from "./collectProgram.js"
import { strictEqual } from "../equivalence.js"

const isZero = strictEqual(0)

const makeWorkspacePolicySlot = (policyIndex: number, policy: WorkspacePolicy) =>
  Tuple.make(policyIndex, policy)

const workspacePolicySlot = (policy: WiringPolicy, policyIndex: number) => {
  if (!isWorkspacePolicy(policy)) {
    return Result.failVoid
  }

  const slot = makeWorkspacePolicySlot(policyIndex, policy)

  return Result.succeed(slot)
}

export const collectWorkspacePolicyDetections = (
  workspaceRoot: string,
  config: WiringConfig,
  workspaceFilesByWiring: ReadonlyArray<MutableWorkspaceFiles>,
  seenByWiring: ReadonlyArray<MutableSeenBuckets>,
  elementsByWiring: ReadonlyArray<MutableElementBuckets>
) => {
  Array.forEach(config, (entry, wiringIndex) => {
    const workspaceSlots = Array.filterMap(entry.wiring.policies, workspacePolicySlot)

    if (isZero(workspaceSlots.length)) {
      return
    }

    const maybeWorkspaceFiles = Array.get(workspaceFilesByWiring, wiringIndex)

    if (Option.isNone(maybeWorkspaceFiles)) {
      return
    }

    const workspaceFileValues = HashMap.values(maybeWorkspaceFiles.value)
    const sourceFiles = Array.fromIterable(workspaceFileValues)
    const workspaceContext = new WorkspaceContext({ workspaceRoot, sourceFiles })
    const workspacePolicies = Array.map(workspaceSlots, Tuple.get(1))
    const detectionsByWorkspacePolicy = toWorkspacePolicies(workspacePolicies)(workspaceContext)

    Array.forEach(detectionsByWorkspacePolicy, (detections, workspacePolicyIndex) => {
      const maybeSlot = Array.get(workspaceSlots, workspacePolicyIndex)

      if (Option.isNone(maybeSlot)) {
        return
      }

      const policyIndex = Tuple.get(maybeSlot.value, 0)
      const maybeStorage = storageForSlot(seenByWiring, elementsByWiring, wiringIndex, policyIndex)

      if (Option.isNone(maybeStorage)) {
        return
      }

      const store = appendDetection(maybeStorage.value.seen, maybeStorage.value.elements)

      Array.forEach(detections, store)
    })
  })

  return config.length
}

const makeSignalForPolicy = (
  elementsByWiring: ReadonlyArray<MutableElementBuckets>,
  wiringIndex: number,
  policy: WiringPolicy,
  policyIndex: number
) => {
  const maybeWiringElements = Array.get(elementsByWiring, wiringIndex)

  const elementsAtPolicy = (wiringElements: MutableElementBuckets) =>
    Array.get(wiringElements, policyIndex)

  const maybeElements = pipe(maybeWiringElements, Option.flatMap(elementsAtPolicy))

  const detections = pipe(
    maybeElements,
    Option.map(MutableList.toArray),
    Option.getOrElse(noDetections)
  )

  return new Signal({
    name: policy.name,
    reported: policy.reported,
    detections,
    examples: policy.examples
  })
}

export const makeWiringSignalsForEntry =
  (
    elementsByWiring: ReadonlyArray<MutableElementBuckets>,
    matchedWiringIndexSet: HashMap.HashMap<number, true>
  ) =>
  (entry: WiringEntry, wiringIndex: number) => {
    const makeSignal = (policy: WiringPolicy, policyIndex: number) =>
      makeSignalForPolicy(elementsByWiring, wiringIndex, policy, policyIndex)

    const signals = Array.map(entry.wiring.policies, makeSignal)
    const matched = HashMap.has(matchedWiringIndexSet, wiringIndex)

    return new WiringSignals({
      matched,
      signals
    })
  }
