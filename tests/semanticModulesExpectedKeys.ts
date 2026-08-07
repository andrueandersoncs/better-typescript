import * as ts from "typescript"
import type { SemanticModuleEntityKey } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEntityKey"

export const expectedKeys: ReadonlyArray<SemanticModuleEntityKey> = [
  {
    path: "src/singletons.ts",
    start: 0,
    end: 55,
    syntaxKind: ts.SyntaxKind.FunctionDeclaration
  },
  {
    path: "src/singletons.ts",
    start: 57,
    end: 102,
    syntaxKind: ts.SyntaxKind.ClassDeclaration
  },
  {
    path: "src/singletons.ts",
    start: 104,
    end: 154,
    syntaxKind: ts.SyntaxKind.InterfaceDeclaration
  },
  {
    path: "src/singletons.ts",
    start: 156,
    end: 187,
    syntaxKind: ts.SyntaxKind.TypeAliasDeclaration
  },
  {
    path: "src/status.ts",
    start: 0,
    end: 40,
    syntaxKind: ts.SyntaxKind.EnumDeclaration
  }
]
