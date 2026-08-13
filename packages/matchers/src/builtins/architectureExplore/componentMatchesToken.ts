import { strictEqual } from "../../equivalence.js"
import { componentToken } from "./componentToken.js"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"

export const componentMatchesToken =
  (expectedToken: string) => (component: ReadonlyArray<SemanticModuleEntityKey>) => {
    const actualToken = componentToken(component)

    return strictEqual(actualToken)(expectedToken)
  }
