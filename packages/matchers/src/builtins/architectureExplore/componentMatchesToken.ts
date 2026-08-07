import { strictEqual } from "@better-typescript/matchers/equivalence"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { componentToken } from "./componentToken.js"

export const componentMatchesToken =
  (expectedToken: string) => (component: ReadonlyArray<SemanticModuleEntityKey>) => {
    const actualToken = componentToken(component)
    return strictEqual(actualToken)(expectedToken)
  }
