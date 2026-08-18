import * as ts from "typescript"
import { Array } from "effect"

// DeclarationStatement is shared declaration syntax because blank-line checks need one vocabulary.
export type DeclarationStatement =
  | ts.VariableStatement
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
  | ts.ModuleDeclaration

export const isDeclarationStatement = (node: ts.Node): node is DeclarationStatement => {
  const isVariableStatement = ts.isVariableStatement(node)
  const isFunctionDeclaration = ts.isFunctionDeclaration(node)
  const isClassDeclaration = ts.isClassDeclaration(node)
  const isInterfaceDeclaration = ts.isInterfaceDeclaration(node)
  const isTypeAliasDeclaration = ts.isTypeAliasDeclaration(node)
  const isEnumDeclaration = ts.isEnumDeclaration(node)
  const isModuleDeclaration = ts.isModuleDeclaration(node)

  const conditions = Array.make(
    isVariableStatement,
    isFunctionDeclaration,
    isClassDeclaration,
    isInterfaceDeclaration,
    isTypeAliasDeclaration,
    isEnumDeclaration,
    isModuleDeclaration
  )

  return Array.some(conditions, Boolean)
}
