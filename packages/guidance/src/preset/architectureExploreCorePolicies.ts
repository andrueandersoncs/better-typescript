import { Function, Match as EffectMatch, Tuple, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/match"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"
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

export const passThroughWrappers = makeBuiltinPolicy({
  name: "pass-through-wrappers",
  matcher: passThroughWrappersMatcher,
  guidance: Function.constant(makePassThroughWrappersFindings),
  reported: false,
  stage: "program"
})

export const interfaceBurden = makeBuiltinPolicy({
  name: "interface-burden",
  matcher: interfaceBurdenMatcher,
  guidance: factGuidance(
    "Interface burden evidence — this Module exposes many callable operations or required parameters.",
    "Interface size is evidence, not a depth verdict. Architecture Explore combines it with low-leverage forwarding before recommending a smaller, deeper interface."
  ),
  reported: false,
  stage: "program"
})

export const moduleGraph = makeBuiltinPolicy({
  name: "module-graph",
  matcher: moduleGraphMatcher,
  guidance: factGuidance(
    "Module graph evidence — this Module imports other project Modules.",
    "Architecture Explore uses resolved edges to find connected bounce paths; an import count alone is not an architectural defect."
  ),
  reported: false,
  stage: "program"
})

export const testOnlyExports = makeBuiltinPolicy({
  name: "test-only-exports",
  matcher: testOnlyExportsMatcher,
  guidance: factGuidance(
    "Test-only export evidence — production exposes this callable only so tests can reach implementation.",
    "Test through the same public interface as production callers, then make this internal helper private."
  ),
  reported: false,
  stage: "program"
})

export const seamLeakageEvidence = makeBuiltinPolicy({
  name: "seam-leakage-evidence",
  matcher: seamLeakageEvidenceMatcher,
  guidance: factGuidance(
    "Seam leakage evidence — this import reaches through an internal or package-source path.",
    "Route callers and tests through the Module's declared public interface so implementation layout can change locally."
  ),
  reported: false,
  stage: "program"
})

export const importUsage = makeBuiltinPolicy({
  name: "import-usage",
  matcher: importUsageMatcher,
  guidance: factGuidance(
    "Import usage evidence — this import declaration binds names used in the file.",
    "Counts are purely syntactic within the importing file; local shadowing of an import binding can inflate or hide references."
  ),
  reported: false,
  stage: "program"
})

export const moduleIdentity = makeBuiltinPolicy({
  name: "module-identity",
  matcher: moduleIdentityMatcher,
  guidance: factGuidance(
    "Module identity evidence — this source file publishes one or more package export aliases.",
    "Aliases come from package.json exports matched to the file's emitted path; missing outDir yields no identity evidence."
  ),
  reported: false,
  stage: "program"
})

export const exportSurface = makeBuiltinPolicy({
  name: "export-surface",
  matcher: exportSurfaceMatcher,
  guidance: factGuidance(
    "Export surface evidence — this Module publishes symbols referenced outside the home file.",
    "Reference and call counts exclude the declaring file so deletion tests can weigh external consumers only."
  ),
  reported: false,
  stage: "program"
})

export const architectureExploreCorePolicies = Tuple.make(
  passThroughWrappers,
  interfaceBurden,
  moduleGraph,
  testOnlyExports,
  seamLeakageEvidence,
  importUsage,
  moduleIdentity,
  exportSurface
)
