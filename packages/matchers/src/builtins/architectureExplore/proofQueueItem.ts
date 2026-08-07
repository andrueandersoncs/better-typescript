import { Data } from "effect"
import type { SemanticModuleMembershipProofStep } from "./semanticModuleMembershipProofStep.js"

// ProofQueueItem is a BFS queue node because proof search stores path tips by entity.
export class ProofQueueItem extends Data.Class<{
  readonly token: string
  readonly path: ReadonlyArray<SemanticModuleMembershipProofStep>
}> {}
