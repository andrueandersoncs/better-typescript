import { Data, Function, MutableRef, Option, Struct, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type * as ts from "typescript"
import { makeMatcherFromSubscriptions } from "@better-typescript/matchers/matcher"
import type { Matcher, Subscription } from "@better-typescript/matchers/matcher/data"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { ModuleEdge, buildModuleEdges } from "./moduleEdges.js"
import { ExportReferenceIndex, buildExportReferenceIndex } from "./programSymbols.js"

// Shared facts stay together because otherwise matchers rebuild the same Program work.
class ArchitectureEvidence extends Data.Class<{
  readonly exportReferenceIndex: ExportReferenceIndex
  readonly moduleEdges: ReadonlyArray<ModuleEdge>
}> {}

// The cache retains one Program because workspace analysis is sequential.
class CachedArchitectureEvidence extends Data.Class<{
  readonly program: ts.Program
  readonly evidence: ArchitectureEvidence
}> {}

const emptyEvidenceCache = Option.none<CachedArchitectureEvidence>()
const evidenceCache = MutableRef.make(emptyEvidenceCache)

const buildArchitectureEvidence = (context: ProgramContext) => {
  const exportReferenceIndex = buildExportReferenceIndex(context)
  const moduleEdges = buildModuleEdges(context)

  return new ArchitectureEvidence({ exportReferenceIndex, moduleEdges })
}

const architectureEvidence = (context: ProgramContext) => {
  const cached = MutableRef.get(evidenceCache)

  const matchesProgram = flow(
    Struct.get<CachedArchitectureEvidence, "program">("program"),
    strictEqual(context.program)
  )

  const current = pipe(cached, Option.filter(matchesProgram))

  if (Option.isSome(current)) {
    return current.value.evidence
  }

  const evidence = buildArchitectureEvidence(context)
  const entry = new CachedArchitectureEvidence({ program: context.program, evidence })
  const updated = Option.some(entry)

  MutableRef.set(evidenceCache, updated)

  return evidence
}

export const exportReferenceIndex = pipe(
  architectureEvidence,
  Function.compose(Struct.get("exportReferenceIndex"))
)

export const moduleEdges = pipe(architectureEvidence, Function.compose(Struct.get("moduleEdges")))

export const evidenceMatcher =
  <Evidence>(evidenceFor: (context: ProgramContext) => Evidence) =>
  (subscriptions: (evidence: Evidence) => ReadonlyArray<Subscription>): Matcher =>
    pipe(evidenceFor, Function.compose(subscriptions), makeMatcherFromSubscriptions)
