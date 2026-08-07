import { Array, Schema } from "effect"
import { SemanticModuleBondKey } from "./semanticModuleBondKey.js"

const proofDirections = Array.make<["forward", "reverse"]>("forward", "reverse")
const proofDirectionSchema = Schema.Literals(proofDirections)

// ProofStep has direction because stored bond endpoints stay canonical.
export const SemanticModuleMembershipProofStep = Schema.Struct({
  bondKey: SemanticModuleBondKey,
  direction: proofDirectionSchema
})

export interface SemanticModuleMembershipProofStep extends Schema.Schema.Type<
  typeof SemanticModuleMembershipProofStep
> {}

export { proofDirections, proofDirectionSchema }
