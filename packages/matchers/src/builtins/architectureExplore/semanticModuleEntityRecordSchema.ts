import { Array, Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { semanticModuleEntityKeysSchema } from "./semanticModuleEntityKeysSchema.js"

const declarationKinds = Array.make<
  [
    "FunctionDeclaration",
    "ClassDeclaration",
    "InterfaceDeclaration",
    "TypeAliasDeclaration",
    "EnumDeclaration",
    "VariableDeclaration",
    "ModuleDeclaration"
  ]
>(
  "FunctionDeclaration",
  "ClassDeclaration",
  "InterfaceDeclaration",
  "TypeAliasDeclaration",
  "EnumDeclaration",
  "VariableDeclaration",
  "ModuleDeclaration"
)

// declarationKindSchema lists kinds because entity records share one closed set.
export const declarationKindSchema = Schema.Literals(declarationKinds)

const strata = Array.make<["production", "test"]>("production", "test")
// stratumSchema lists strata because entity records share one closed set.
export const stratumSchema = Schema.Literals(strata)

// EntityRecord keeps display evidence because names cannot define membership.
export const SemanticModuleEntityRecord = Schema.Struct({
  key: SemanticModuleEntityKey,
  declarationAnchors: semanticModuleEntityKeysSchema,
  stratum: stratumSchema,
  displayName: Schema.String,
  declarationKind: declarationKindSchema
})

export interface SemanticModuleEntityRecord extends Schema.Schema.Type<
  typeof SemanticModuleEntityRecord
> {}

export { declarationKinds, strata }
