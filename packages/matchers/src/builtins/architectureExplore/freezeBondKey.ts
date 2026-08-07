import { SemanticModuleBondKey } from "./semanticModuleBondKey.js"

export const freezeBondKey = (key: SemanticModuleBondKey) => {
  Object.freeze(key.left)
  Object.freeze(key.right)

  return Object.freeze(key)
}
