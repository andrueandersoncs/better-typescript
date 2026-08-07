import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { entityKeyEquivalence } from "./entityKeyEquivalence.js"

export const entityKeyMatches =
  (expected: SemanticModuleEntityKey) => (actual: SemanticModuleEntityKey) =>
    entityKeyEquivalence(expected, actual)
