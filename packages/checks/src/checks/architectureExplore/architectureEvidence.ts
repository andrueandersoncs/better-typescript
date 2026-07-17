import { Data, Effect, Function, Option, Ref, Struct, Tuple, pipe } from "effect"
import type * as ts from "typescript"
import { checkFromSubscriptions } from "@better-typescript/core/engine/check"
import type { Check, Subscription } from "@better-typescript/core/engine/check/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import {
  ExportReferenceIndex,
  ModuleEdge,
  buildExportReferenceIndex,
  buildModuleEdges
} from "./programSymbols.js"

// Shared facts stay together because otherwise Checks rebuild the same Program work.
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
const evidenceCache = Ref.makeUnsafe(emptyEvidenceCache)

const buildArchitectureEvidence = (context: ProgramContext): ArchitectureEvidence => {
  const exportReferenceIndex = buildExportReferenceIndex(context)
  const moduleEdges = buildModuleEdges(context)

  return new ArchitectureEvidence({ exportReferenceIndex, moduleEdges })
}

const readOrBuildEvidence =
  (context: ProgramContext) =>
  (
    cached: Option.Option<CachedArchitectureEvidence>
  ): readonly [ArchitectureEvidence, Option.Option<CachedArchitectureEvidence>] => {
    const current = pipe(
      cached,
      Option.filter((entry) => entry.program === context.program)
    )

    if (Option.isSome(current)) {
      return Tuple.make(current.value.evidence, cached)
    }

    const evidence = buildArchitectureEvidence(context)
    const entry = new CachedArchitectureEvidence({ program: context.program, evidence })
    const updated = Option.some(entry)

    return Tuple.make(evidence, updated)
  }

const architectureEvidence = (context: ProgramContext): ArchitectureEvidence =>
  pipe(Ref.modify(evidenceCache, readOrBuildEvidence(context)), Effect.runSync)

export const exportReferenceIndex = pipe(
  architectureEvidence,
  Function.compose(Struct.get("exportReferenceIndex"))
)

export const moduleEdges = pipe(architectureEvidence, Function.compose(Struct.get("moduleEdges")))

export const evidenceCheck =
  <Evidence>(evidenceFor: (context: ProgramContext) => Evidence) =>
  (subscriptions: (evidence: Evidence) => ReadonlyArray<Subscription>): Check =>
    pipe(evidenceFor, Function.compose(subscriptions), checkFromSubscriptions)
