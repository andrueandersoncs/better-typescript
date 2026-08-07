import { Schema } from "effect"
import { unownedSemanticReferenceWitnessSchema } from "./unownedSemanticReferenceWitnessSchema.js"

// UnownedSemanticReferenceWitness aliases the unowned-edge schema because callers need Schema.Type.
export interface UnownedSemanticReferenceWitness extends Schema.Schema.Type<
  typeof unownedSemanticReferenceWitnessSchema
> {}
