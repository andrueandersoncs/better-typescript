import type { SemanticModuleEntityKey } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEntityKey"

export const exclusiveConsumerOwnershipEntityKey = (start: number): SemanticModuleEntityKey => ({
  path: "src/main.ts",
  start,
  end: start + 1,
  syntaxKind: 262
})
