import * as ts from "typescript"
import { Option } from "effect"

export const returnStatementExpression = (statement: ts.ReturnStatement) =>
  Option.fromNullishOr(statement.expression)
