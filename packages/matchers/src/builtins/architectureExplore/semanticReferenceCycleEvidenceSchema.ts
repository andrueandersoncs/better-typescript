import { Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { semanticReferenceWitnessSchema } from "./semanticReferenceWitnessSchema.js"

const semanticReferenceCycleTag = Schema.Literal("semantic-reference-cycle")
const semanticReferenceCycleVersion = Schema.Literal(1)

const componentKeysField = Schema.Array(SemanticModuleEntityKey)
const internalReferencesField = Schema.Array(semanticReferenceWitnessSchema)

// Cycle evidence is tagged because the cycle hard-bond rule freezes one payload.
export const semanticReferenceCycleEvidenceSchema = Schema.Struct({
  _tag: semanticReferenceCycleTag,
  version: semanticReferenceCycleVersion,
  component: componentKeysField,
  internalReferences: internalReferencesField
})

export interface semanticReferenceCycleEvidenceSchema extends Schema.Schema.Type<
  typeof semanticReferenceCycleEvidenceSchema
> {}
