import type { SemanticModuleEntityKey } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEntityKey"

export const keyEquals = (left: SemanticModuleEntityKey, right: SemanticModuleEntityKey) =>
  left.path === right.path &&
  left.start === right.start &&
  left.end === right.end &&
  left.syntaxKind === right.syntaxKind
