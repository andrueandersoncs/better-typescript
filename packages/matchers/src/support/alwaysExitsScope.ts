import * as ts from "typescript"
import { HashSet, Option } from "effect"

export const exitStatementKinds = HashSet.make(
  ts.SyntaxKind.BreakStatement,
  ts.SyntaxKind.ContinueStatement,
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ThrowStatement
)

export const alwaysExitsScope = (statement: ts.Statement): boolean => {
  if (ts.isBlock(statement)) {
    const lastIndex = statement.statements.length - 1
    const lastStmt = Option.fromNullishOr(statement.statements[lastIndex])

    return Option.exists(lastStmt, alwaysExitsScope)
  }

  return HashSet.has(exitStatementKinds, statement.kind)
}
