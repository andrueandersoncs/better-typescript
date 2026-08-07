import { Schema } from "effect"
import { semanticReferenceWitnessSchema } from "./semanticReferenceWitnessSchema.js"

// SemanticReferenceWitness aliases the owned-edge schema because callers need Schema.Type.
export interface SemanticReferenceWitness extends Schema.Schema.Type<
  typeof semanticReferenceWitnessSchema
> {}
