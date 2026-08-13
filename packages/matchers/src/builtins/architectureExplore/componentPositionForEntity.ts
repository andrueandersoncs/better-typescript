import { HashMap, pipe } from "effect"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { portableKeyToken } from "./portableKeyToken.js"

const positionIn = (indexByEntity: HashMap.HashMap<string, number>) => (token: string) =>
  HashMap.get(indexByEntity, token)

export const componentPositionForEntity =
  (indexByEntity: HashMap.HashMap<string, number>) => (key: SemanticModuleEntityKey) =>
    pipe(key, portableKeyToken, positionIn(indexByEntity))
