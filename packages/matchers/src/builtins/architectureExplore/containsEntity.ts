import { Array } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { SemanticModuleRecord } from "./semanticModuleRecord.js"
import { entityKeyMatches } from "./entityKeyMatches.js"

export const containsEntity = (key: SemanticModuleEntityKey) => (module: SemanticModuleRecord) =>
  Array.some(module.members, entityKeyMatches(key))
