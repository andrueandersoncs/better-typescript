import { Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"

// semanticModuleEntityKeysSchema lists entity keys because components encode key arrays once.
export const semanticModuleEntityKeysSchema = Schema.Array(SemanticModuleEntityKey)
