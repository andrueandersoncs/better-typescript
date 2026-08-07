import { Array } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"

export const entityKeyToken = (key: SemanticModuleEntityKey) => {
  const startToken = String(key.start)
  const endToken = String(key.end)
  const kindToken = String(key.syntaxKind)
  const parts = Array.make(key.path, startToken, endToken, kindToken)
  return Array.join(parts, "\x00")
}
