import { Option } from "effect"
import * as ts from "typescript"

export type FunctionInitializer = ts.ArrowFunction | ts.FunctionExpression

export const isFunctionInitializer = (node: ts.Node): node is FunctionInitializer =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node)

export const functionInitializer = (
  declaration: ts.VariableDeclaration
): Option.Option<FunctionInitializer> =>
  Option.fromNullable(declaration.initializer).pipe(Option.filter(isFunctionInitializer))

export const unwrapExpression = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression)
    ? unwrapExpression(expression.expression)
    : expression

export const unwrapSingleStatementBlock = (statement: ts.Statement): ts.Statement => {
  if (!ts.isBlock(statement)) {
    return statement
  }

  const hasOneStatement = statement.statements.length === 1

  return hasOneStatement ? statement.statements[0] : statement
}
