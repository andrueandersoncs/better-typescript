import { Array, Effect, Record, Struct } from "effect"
import type { Advice } from "@better-typescript/core/engine/derive/advice"
import type { NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import { filterFallbackAdviceForUncoveredFiles } from "@better-typescript/core/engine/fileLevelAdvice"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { signalOf } from "@better-typescript/core/engine/signal/signal"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { conceptProliferation } from "../conceptControl/conceptProliferation.js"
import { highSignalDensity } from "../derive/highSignalDensity.js"
import { ruleDominance } from "../derive/ruleDominance.js"
import { sideEffectLaundering } from "../derive/sideEffectLaundering.js"
import { hotSubsystem } from "../hotSubsystem/hotSubsystem.js"
import { imperativeStateManager } from "../imperativeStateManager/imperativeStateManager.js"
import { pipelineHostile } from "../pipelineHostile/pipelineHostile.js"
import { systemicHotspots } from "../systemicHotspots/systemicHotspots.js"
import { commentAndDeclarationPolicies } from "./commentAndDeclarationPolicies.js"
import { conceptAndCompositionPolicies } from "./conceptAndCompositionPolicies.js"
import { controlFlowPolicies } from "./controlFlowPolicies.js"

import { dispatchAndCollectionPolicies } from "./dispatchAndCollectionPolicies.js"
import { effectIdiomPolicies } from "./effectIdiomPolicies.js"
import { errorHygienePolicies } from "./errorHygienePolicies.js"
import { expressionAndMutationPolicies } from "./expressionAndMutationPolicies.js"
import { semanticNamingPolicies } from "./semanticNamingPolicies.js"

const materializeSpecificAdvice = (
  noMutation: Signal["detections"],
  preferHashMap: Signal["detections"],
  preferHashSet: Signal["detections"],
  noMutableArrayMethods: Signal["detections"],
  noMutableVariableDeclarations: Signal["detections"],
  noNestedCalls: Signal["detections"],
  preferCurriedDataLastFunctions: Signal["detections"],
  namedElements: ReadonlyArray<NamedDetection>,
  conceptSignals: ReadonlyArray<Signal["detections"][number]>
): ReadonlyArray<Advice> => {
  const imperativeAdvice = imperativeStateManager(
    noMutation,
    preferHashMap,
    preferHashSet,
    noMutableArrayMethods,
    noMutableVariableDeclarations
  )

  const sideEffectAdvice = sideEffectLaundering(namedElements)
  const pipelineAdvice = pipelineHostile(noNestedCalls, preferCurriedDataLastFunctions)
  const conceptAdvice = conceptProliferation(conceptSignals)
  const adviceGroups = Array.make(imperativeAdvice, sideEffectAdvice, pipelineAdvice, conceptAdvice)

  return Array.flatten(adviceGroups)
}

const defaultNamedElements = (signals: ReadonlyArray<Signal>): ReadonlyArray<NamedDetection> => {
  const reportedSignals = Array.filter(signals, Struct.get("reported"))

  const nameDetections = (signal: Signal) =>
    Array.map(signal.detections, makeNamedDetection(signal.name))

  return Array.flatMap(reportedSignals, nameDetections)
}

const defaultSpecificAdvice = (
  elementsOf: ReturnType<typeof signalOf>,
  namedElements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const noMutation = elementsOf("no-mutation")
  const preferHashMap = elementsOf("prefer-hash-map")
  const preferHashSet = elementsOf("prefer-hash-set")
  const noMutableArrayMethods = elementsOf("no-mutable-array-methods")
  const noMutableVariableDeclarations = elementsOf("no-mutable-variable-declarations")
  const noNestedCalls = elementsOf("no-nested-calls")
  const preferCurried = elementsOf("prefer-curried-data-last-functions")
  const conceptSignals = elementsOf("concept-control")

  return materializeSpecificAdvice(
    noMutation,
    preferHashMap,
    preferHashSet,
    noMutableArrayMethods,
    noMutableVariableDeclarations,
    noNestedCalls,
    preferCurried,
    namedElements,
    conceptSignals
  )
}

const materializeDefaultAdvice = (
  elementsOf: ReturnType<typeof signalOf>,
  namedElements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const specificItems = defaultSpecificAdvice(elementsOf, namedElements)
  const densityItems = highSignalDensity(namedElements)
  const subsystemItems = hotSubsystem(namedElements)
  const dominanceItems = ruleDominance(namedElements)

  const densityAfterFallbackSuppression =
    filterFallbackAdviceForUncoveredFiles(specificItems)(densityItems)

  const systemicItems = systemicHotspots(subsystemItems, densityAfterFallbackSuppression)

  const adviceGroups = Array.make(
    specificItems,
    densityAfterFallbackSuppression,
    subsystemItems,
    dominanceItems,
    systemicItems
  )

  return Array.flatten(adviceGroups)
}

export const defaultDerive = Effect.fn("DefaultWiring.derive")((signals: ReadonlyArray<Signal>) => {
  const elementsOf = signalOf(signals)
  const namedElements = defaultNamedElements(signals)
  const advice = materializeDefaultAdvice(elementsOf, namedElements)

  return Effect.succeed(advice)
})

// Category property order is fixed because it defines report order.
const defaultPolicyCategories = {
  effectIdiomPolicies,
  commentAndDeclarationPolicies,
  conceptAndCompositionPolicies,
  controlFlowPolicies,
  semanticNamingPolicies,
  errorHygienePolicies,
  expressionAndMutationPolicies,
  dispatchAndCollectionPolicies
}

const defaultPolicyGroups = Record.values(defaultPolicyCategories)

export const defaultPolicyCatalog: ReadonlyArray<Policy> = Array.flatten(defaultPolicyGroups)

export const defaultWiring = makeWiring({
  policies: defaultPolicyCatalog,
  derive: defaultDerive
})

const defaultFiles = Array.of("**/*")

const defaultConfigEntries = Array.of({
  files: defaultFiles,
  wiring: defaultWiring
})

export const defaultConfig = defineConfig(defaultConfigEntries)
