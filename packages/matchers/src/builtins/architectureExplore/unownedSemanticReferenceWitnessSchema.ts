import { Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { semanticReferenceKindSchema } from "./semanticReferenceKindSchema.js"

// unownedSemanticReferenceWitnessSchema is the unowned because graphs record externals.
export const unownedSemanticReferenceWitnessSchema = Schema.Struct({
  target: SemanticModuleEntityKey,
  reference: SemanticModuleEntityKey,
  kind: semanticReferenceKindSchema
})

export interface unownedSemanticReferenceWitnessSchema extends Schema.Schema.Type<
  typeof unownedSemanticReferenceWitnessSchema
> {}
