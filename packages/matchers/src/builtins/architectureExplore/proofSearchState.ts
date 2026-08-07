import { Data, HashMap, Option } from "effect"
import type { SemanticModuleMembershipProofStep } from "./semanticModuleMembershipProofStep.js"
import type { ProofQueueItem } from "./proofQueueItem.js"

// ProofSearchState is BFS state because proof search needs queue and visited together.
export class ProofSearchState extends Data.Class<{
  readonly queue: ReadonlyArray<ProofQueueItem>
  readonly visited: HashMap.HashMap<string, true>
  readonly result: Option.Option<ReadonlyArray<SemanticModuleMembershipProofStep>>
}> {}
