import * as ts from "typescript"
import { Array } from "effect"

// StatementContainer is shared container syntax because neighbor lookup needs one operation.
export type StatementContainer =
  ts.SourceFile | ts.Block | ts.ModuleBlock | ts.CaseClause | ts.DefaultClause

export const isStatementContainer = (node: ts.Node): node is StatementContainer => {
  const isSourceFile = ts.isSourceFile(node)
  const isBlock = ts.isBlock(node)
  const isModuleBlock = ts.isModuleBlock(node)
  const isCaseClause = ts.isCaseClause(node)
  const isDefaultClause = ts.isDefaultClause(node)
  const conditions = Array.make(isSourceFile, isBlock, isModuleBlock, isCaseClause, isDefaultClause)

  return Array.some(conditions, Boolean)
}
