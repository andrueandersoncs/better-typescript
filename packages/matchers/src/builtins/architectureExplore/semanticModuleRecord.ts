import { Schema } from "effect"
import { semanticModuleEntityKeysSchema } from "./semanticModuleEntityKeysSchema.js"
import { SemanticModuleBondKey } from "./semanticModuleBondKey.js"

const semanticModuleBondKeysSchema = Schema.Array(SemanticModuleBondKey)

// ModuleRecord lists members because modules have no representative identity.
export const SemanticModuleRecord = Schema.Struct({
  members: semanticModuleEntityKeysSchema,
  forestBondKeys: semanticModuleBondKeysSchema
})

export interface SemanticModuleRecord extends Schema.Schema.Type<typeof SemanticModuleRecord> {}

export { semanticModuleBondKeysSchema }
