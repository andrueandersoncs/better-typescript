import { Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { semanticReferenceKindSchema } from "./semanticReferenceKindSchema.js"

// semanticReferenceWitnessSchema is the owned-edge wit because graph build freezes one contract.
export const semanticReferenceWitnessSchema = Schema.Struct({
  consumer: SemanticModuleEntityKey,
  target: SemanticModuleEntityKey,
  reference: SemanticModuleEntityKey,
  kind: semanticReferenceKindSchema
})

export interface semanticReferenceWitnessSchema extends Schema.Schema.Type<
  typeof semanticReferenceWitnessSchema
> {}
