import { Array } from "effect"
import type * as ts from "typescript"
import { isProjectFile } from "../support/isProjectFile.js"
import { isEcmaScriptLibFile } from "./isEcmaScriptLibFile.js"

// Mark a symbol uncontrolled only because every declaration is outside the project and ES library.
export const isUncontrolledSymbol = (symbol: ts.Symbol) => {
  const declarations = symbol.getDeclarations() ?? Array.empty()
  const sourceFiles = Array.map(declarations, (declaration) => declaration.getSourceFile())
  const hasDeclarations = sourceFiles.length > 0
  const isDeclaredInProject = Array.some(sourceFiles, isProjectFile)
  const isEcmaScriptBuiltin = Array.some(sourceFiles, isEcmaScriptLibFile)

  const moduleScopedConditions = Array.make(
    hasDeclarations,
    !isDeclaredInProject,
    !isEcmaScriptBuiltin
  )

  return Array.every(moduleScopedConditions, Boolean)
}
