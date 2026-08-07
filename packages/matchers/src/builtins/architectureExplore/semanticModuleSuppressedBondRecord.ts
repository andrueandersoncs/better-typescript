import { Array, Schema } from "effect"
import { SemanticModuleBondKey } from "./semanticModuleBondKey.js"
import { semanticModuleEvidenceSchema } from "./semanticModuleEvidenceSchema.js"

const suppressionReasons = Array.make<["production-test-partition-barrier"]>(
  "production-test-partition-barrier"
)

const suppressionReasonSchema = Schema.Literals(suppressionReasons)

// SuppressedBond retains evidence because barriers must not erase candidates.
export const SemanticModuleSuppressedBondRecord = Schema.Struct({
  key: SemanticModuleBondKey,
  evidence: semanticModuleEvidenceSchema,
  reason: suppressionReasonSchema
})

export interface SemanticModuleSuppressedBondRecord extends Schema.Schema.Type<
  typeof SemanticModuleSuppressedBondRecord
> {}

export { suppressionReasons, suppressionReasonSchema }
