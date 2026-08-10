import { Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { semanticSubjectWitnessSchema } from "./semanticSubjectWitnessSchema.js"

const semanticSubjectOwnershipTagSchema = Schema.Literal("semantic-subject-ownership")
const semanticSubjectOwnershipVersionSchema = Schema.Literal(1)

// semantic-subject-ownership evidence is tagged because the hard-bond rule freezes one payload.
export const semanticSubjectOwnershipEvidenceSchema = Schema.Struct({
  _tag: semanticSubjectOwnershipTagSchema,
  version: semanticSubjectOwnershipVersionSchema,
  operation: SemanticModuleEntityKey,
  subject: SemanticModuleEntityKey,
  derivation: semanticSubjectWitnessSchema.fields.derivation,
  anchor: SemanticModuleEntityKey
})

export interface semanticSubjectOwnershipEvidenceSchema extends Schema.Schema.Type<
  typeof semanticSubjectOwnershipEvidenceSchema
> {}
