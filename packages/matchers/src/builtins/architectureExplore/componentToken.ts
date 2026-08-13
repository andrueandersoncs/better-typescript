import { Array, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { portableKeyToken } from "./portableKeyToken.js"

export const componentToken = (component: ReadonlyArray<SemanticModuleEntityKey>) =>
  pipe(component, Array.map(portableKeyToken), Array.join("\u0001"))

export const componentMatchesToken =
  (expectedToken: string) => (component: ReadonlyArray<SemanticModuleEntityKey>) => {
    const actualToken = componentToken(component)

    return strictEqual(actualToken)(expectedToken)
  }
