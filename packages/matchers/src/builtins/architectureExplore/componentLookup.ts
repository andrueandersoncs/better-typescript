import { HashMap } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { portableKeyToken } from "./portableKeyToken.js"

export const componentLookup =
  (componentByEntity: HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityKey>>) =>
  (key: SemanticModuleEntityKey) => {
    const token = portableKeyToken(key)
    return HashMap.get(componentByEntity, token)
  }
