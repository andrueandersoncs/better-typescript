import { Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"

// BondKey is canonical because proof references must be portable.
export const SemanticModuleBondKey = Schema.Struct({
  left: SemanticModuleEntityKey,
  right: SemanticModuleEntityKey,
  ruleId: Schema.String,
  evidenceKey: Schema.String
})

export interface SemanticModuleBondKey extends Schema.Schema.Type<typeof SemanticModuleBondKey> {}
