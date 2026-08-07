import { entityKeyToken } from "./entityKeyToken.js"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"

export const portableKeyToken = (key: SemanticModuleEntityKey) => {
  const token = entityKeyToken(key)
  return token
}
