import { Array, pipe } from "effect"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { portableKeyToken } from "./portableKeyToken.js"

export const componentToken = (component: ReadonlyArray<SemanticModuleEntityKey>) =>
  pipe(component, Array.map(portableKeyToken), Array.join("\u0001"))
