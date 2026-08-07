import { Array, Function, Match as EffectMatch, pipe } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import type { Match } from "@better-typescript/matchers/matcher/match"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { makeSilentBuiltinPolicy } from "../makeSilentBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog.js"
import {
  semanticModuleEngine,
  type SemanticModulePlacementData
} from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine.js"
import {
  passThroughWrappers as passThroughWrappersMatcher,
  PassThroughWrapperData
} from "@better-typescript/matchers/builtins/passThroughWrappers"
import { interfaceBurden as interfaceBurdenMatcher } from "@better-typescript/matchers/builtins/interfaceBurden"
import { moduleGraph as moduleGraphMatcher } from "@better-typescript/matchers/builtins/moduleGraph"
import { testOnlyExports as testOnlyExportsMatcher } from "@better-typescript/matchers/builtins/testOnlyExports"
import { seamLeakageEvidence as seamLeakageEvidenceMatcher } from "@better-typescript/matchers/builtins/seamLeakageEvidence"
import { importUsage as importUsageMatcher } from "@better-typescript/matchers/builtins/importUsage"
import { moduleIdentity as moduleIdentityMatcher } from "@better-typescript/matchers/builtins/moduleIdentity"
import { exportSurface as exportSurfaceMatcher } from "@better-typescript/matchers/builtins/exportSurface"

const reexportMessage =
  "Pass-through Module evidence — this public file only re-exports other Modules."

const reexportHint =
  "Use caller count in Architecture Explore Advice to apply the deletion test; a public entry Module with multiple callers may be earning its keep as the seam."

const forwardingMessage =
  "Pass-through export evidence — this operation forwards every parameter unchanged into one call."

const forwardingHint =
  "Use caller count in Architecture Explore Advice: delete low-leverage indirection, but keep operations whose behaviour or naming would otherwise reappear across callers."

const makePassThroughWrappersFindings = (match: Match<PassThroughWrapperData>) => {
  const makeReexportFindings = () =>
    makeFindings(match.target, reexportMessage, reexportHint, match.fact)

  const makeForwardingFindings = () =>
    makeFindings(match.target, forwardingMessage, forwardingHint, match.fact)

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "reexport" }, makeReexportFindings),
    EffectMatch.when({ kind: "forwarding-call" }, makeForwardingFindings),
    EffectMatch.exhaustive
  )
}

export const passThroughWrappers = makeSilentBuiltinPolicy(
  "pass-through-wrappers",
  passThroughWrappersMatcher,
  Function.constant(makePassThroughWrappersFindings)
)

export const interfaceBurden = makeSilentBuiltinPolicy(
  "interface-burden",
  interfaceBurdenMatcher,
  factGuidance(
    "Interface burden evidence — this Module exposes many callable operations or required parameters.",
    "Interface size is evidence, not a depth verdict. Architecture Explore combines it with low-leverage forwarding before recommending a smaller, deeper interface."
  )
)

export const moduleGraph = makeSilentBuiltinPolicy(
  "module-graph",
  moduleGraphMatcher,
  factGuidance(
    "Module graph evidence — this Module imports other project Modules.",
    "Architecture Explore uses resolved edges to find connected bounce paths; an import count alone is not an architectural defect."
  )
)

export const testOnlyExports = makeSilentBuiltinPolicy(
  "test-only-exports",
  testOnlyExportsMatcher,
  factGuidance(
    "Test-only export evidence — production exposes this callable only so tests can reach implementation.",
    "Test through the same public interface as production callers, then make this internal helper private."
  )
)

export const seamLeakageEvidence = makeSilentBuiltinPolicy(
  "seam-leakage-evidence",
  seamLeakageEvidenceMatcher,
  factGuidance(
    "Seam leakage evidence — this import reaches through an internal or package-source path.",
    "Route callers and tests through the Module's declared public interface so implementation layout can change locally."
  )
)

export const importUsage = makeSilentBuiltinPolicy(
  "import-usage",
  importUsageMatcher,
  factGuidance(
    "Import usage evidence — this import declaration binds names used in the file.",
    "Counts are purely syntactic within the importing file; local shadowing of an import binding can inflate or hide references."
  )
)

export const moduleIdentity = makeSilentBuiltinPolicy(
  "module-identity",
  moduleIdentityMatcher,
  factGuidance(
    "Module identity evidence — this source file publishes one or more package export aliases.",
    "Aliases come from package.json exports matched to the file's emitted path; missing outDir yields no identity evidence."
  )
)

export const exportSurface = makeSilentBuiltinPolicy(
  "export-surface",
  exportSurfaceMatcher,
  factGuidance(
    "Export surface evidence — this Module publishes symbols referenced outside the home file.",
    "Reference and call counts exclude the declaring file so deletion tests can weigh external consumers only."
  )
)

export const architectureExploreCorePolicies: ReadonlyArray<Policy> = Array.make(
  passThroughWrappers,
  interfaceBurden,
  moduleGraph,
  testOnlyExports,
  seamLeakageEvidence,
  importUsage,
  moduleIdentity,
  exportSurface
)

const hardBondRuleIdsMatch = (
  left: SemanticModuleHardBondRuleCatalog[number],
  right: SemanticModuleHardBondRuleCatalog[number]
) => strictEqual(left.id)(right.id)

const dedupeHardBondRules = Array.dedupeWith(hardBondRuleIdsMatch)

export const unionHardBondRuleCatalogs = (
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
export const semanticModulePlacement = (catalog: SemanticModuleHardBondRuleCatalog) => {
  const matcher = semanticModuleEngine.semanticModulePlacementMatcher(catalog)

  return makeSilentBuiltinPolicy(
    "semantic-module-placement",
    matcher,
    Function.constant(makeSemanticModulePlacementFindings)
  )
}

// Fleet wiring is authored once because catalog/policy concatenation must not drift across fleets.
export const makeArchitectureExplorePolicies = (
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
