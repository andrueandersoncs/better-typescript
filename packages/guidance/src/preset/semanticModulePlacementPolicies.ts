import { Array, Data, Function, Match as EffectMatch, pipe } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Match } from "@better-typescript/matchers/matcher/match"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog.js"
import { semanticModuleEngine } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine.js"
import type { SemanticModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine.js"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { architectureExploreCorePolicies } from "./architectureExploreCorePolicies.js"
import { semanticModulePlacementName as stableSemanticModulePlacementName } from "./semanticModulePlacementName.js"

const makeSemanticModulePlacementPolicyExports = () => {
  const hardBondRuleIdsMatch = (
    left: SemanticModuleHardBondRuleCatalog[number],
    right: SemanticModuleHardBondRuleCatalog[number]
  ) => strictEqual(left.id)(right.id)

  const dedupeHardBondRules = Array.dedupeWith(hardBondRuleIdsMatch)

  const unionHardBondRuleCatalogs = (
    catalogs: ReadonlyArray<SemanticModuleHardBondRuleCatalog>
  ): SemanticModuleHardBondRuleCatalog => {
    const flattenedCatalogs = Array.flatten(catalogs)
    const dedupedRules = dedupeHardBondRules(flattenedCatalogs)

    return Object.freeze(dedupedRules)
  }

  const splitMessage = "This Semantic Module spans multiple Physical Modules."

  const splitHint =
    "Keep every listed Code Entity in one Physical Module; the reporting anchor does not imply a destination or move direction."

  const mixedMessage = "This Physical Module contains Code Entities from multiple Semantic Modules."

  const mixedHint =
    "Separate the listed Semantic Modules without splitting their complete membership; no destination or move direction is inferred."

  const makeSemanticModulePlacementFindings = (match: Match<SemanticModulePlacementData>) => {
    const makeSplitFindings = () => makeFindings(match.target, splitMessage, splitHint, match.fact)
    const makeMixedFindings = () => makeFindings(match.target, mixedMessage, mixedHint, match.fact)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ _tag: "split-semantic-module" }, makeSplitFindings),
      EffectMatch.when({ _tag: "mixed-physical-module" }, makeMixedFindings),
      EffectMatch.exhaustive
    )
  }

  // semanticModulePlacement requires an explicit catalog because paradigms never select themselves.
  const semanticModulePlacement = (catalog: SemanticModuleHardBondRuleCatalog) => {
    const matcher = semanticModuleEngine.semanticModulePlacementMatcher(catalog)

    return makeBuiltinPolicy({
      name: stableSemanticModulePlacementName,
      matcher: matcher,
      guidance: Function.constant(makeSemanticModulePlacementFindings),
      reported: false,
      stage: "program"
    })
  }

  // Fleet wiring is authored once because catalog/policy concatenation must not drift across fleets.
  const makeArchitectureExplorePolicies = (
    fleetPolicies: ReadonlyArray<Policy>,
    catalogInputs: ReadonlyArray<SemanticModuleHardBondRuleCatalog>
  ): ReadonlyArray<Policy> => {
    const placementCatalog = unionHardBondRuleCatalogs(catalogInputs)
    const placementPolicy = semanticModulePlacement(placementCatalog)

    return pipe(
      architectureExploreCorePolicies,
      Array.appendAll(fleetPolicies),
      Array.append(placementPolicy)
    )
  }

  class SemanticModulePlacementPolicyExports extends Data.Class<{
    readonly semanticModulePlacementName: typeof stableSemanticModulePlacementName
    readonly unionHardBondRuleCatalogs: typeof unionHardBondRuleCatalogs
    readonly semanticModulePlacement: typeof semanticModulePlacement
    readonly makeArchitectureExplorePolicies: typeof makeArchitectureExplorePolicies
  }> {}

  return new SemanticModulePlacementPolicyExports({
    semanticModulePlacementName: stableSemanticModulePlacementName,
    unionHardBondRuleCatalogs,
    semanticModulePlacement,
    makeArchitectureExplorePolicies
  })
}

export const {
  semanticModulePlacementName,
  unionHardBondRuleCatalogs,
  semanticModulePlacement,
  makeArchitectureExplorePolicies
} = makeSemanticModulePlacementPolicyExports()
