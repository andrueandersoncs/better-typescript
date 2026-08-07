import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"

export const unwrapSingleStatementBlock = (statement: ts.Statement) => {
  if (!ts.isBlock(statement)) {
    return statement
  }

  const hasOneStatement = strictEqual(1)(statement.statements.length)

  return hasOneStatement ? statement.statements[0] : statement
}
