import { Array, Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"

const exclusionReasons = Array.make<["ambient-declaration", "missing-symbol"]>(
  "ambient-declaration",
  "missing-symbol"
)

const exclusionReasonSchema = Schema.Literals(exclusionReasons)

// Exclusion retains anchors because normalization cannot invent identity.
export const SemanticModuleExclusionRecord = Schema.Struct({
  anchor: SemanticModuleEntityKey,
  reason: exclusionReasonSchema
})

export interface SemanticModuleExclusionRecord extends Schema.Schema.Type<
  typeof SemanticModuleExclusionRecord
> {}

export { exclusionReasons, exclusionReasonSchema }
