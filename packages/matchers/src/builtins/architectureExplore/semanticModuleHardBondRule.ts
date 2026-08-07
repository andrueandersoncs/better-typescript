import { Predicate, Schema } from "effect"
import type { ProgramMatchContext } from "../../matcher/programMatchContext.js"
import { SemanticModuleEntityRecord } from "./semanticModuleEntityRecordSchema.js"
import { SemanticModuleHardBondCandidate } from "./semanticModuleHardBondCandidate.js"
import { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"

type HardBondCandidates = (
  context: ProgramMatchContext,
  entities: ReadonlyArray<SemanticModuleEntityRecord>,
  referenceGraph: SemanticModuleReferenceGraph
) => ReadonlyArray<SemanticModuleHardBondCandidate>

const hardBondCandidatesSchema = Schema.declare(
  Predicate.isFunction as (input: unknown) => input is HardBondCandidates
)

// HardBondRule is preset-owned because source code never selects a paradigm.
export const SemanticModuleHardBondRule = Schema.Struct({
  id: Schema.String,
  evidenceSchema: Schema.Any,
  candidates: hardBondCandidatesSchema
})

export interface SemanticModuleHardBondRule extends Schema.Schema.Type<
  typeof SemanticModuleHardBondRule
> {}
