import { Array, Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"

const derivationKinds = Array.make("subject-parameters", "subject-derived")
const derivationSchema = Schema.Literals(derivationKinds)

// The witness schema is one Semantic Module because the subject rule freezes one payload.
export const semanticSubjectWitnessSchema = Schema.Struct({
  operation: SemanticModuleEntityKey,
  subject: SemanticModuleEntityKey,
  derivation: derivationSchema,
  anchor: SemanticModuleEntityKey
})

export interface semanticSubjectWitnessSchema extends Schema.Schema.Type<
  typeof semanticSubjectWitnessSchema
> {}
