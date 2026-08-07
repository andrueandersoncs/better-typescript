import { Schema } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"

// entityKeyComponentSchema lists entity keys because ownership evidence shares one component
export const entityKeyComponentSchema = Schema.Array(SemanticModuleEntityKey)
