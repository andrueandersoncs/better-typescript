import * as ts from "typescript"
import { isProjectFile } from "./isProjectFile.js"
import { Array } from "effect"

export const isFirstPartySymbol = (symbol: ts.Symbol) => {
  const declarations = symbol.getDeclarations() ?? Array.empty()
  const sourceFiles = Array.map(declarations, (declaration) => declaration.getSourceFile())

  return Array.some(sourceFiles, isProjectFile)
}
