import { Option } from "effect"
import * as ts from "typescript"

export type FunctionInitializer = ts.ArrowFunction | ts.FunctionExpression

export type ReturnTypeDeclaration =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.MethodSignature
  | ts.CallSignatureDeclaration
  | ts.FunctionTypeNode
  | ts.GetAccessorDeclaration

export const isFunctionInitializer = (node: ts.Node): node is FunctionInitializer =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node)

export const isReturnTypeDeclaration = (node: ts.Node): node is ReturnTypeDeclaration =>
  [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node),
    ts.isMethodSignature(node),
    ts.isCallSignatureDeclaration(node),
    ts.isFunctionTypeNode(node),
    ts.isGetAccessorDeclaration(node)
  ].some(Boolean)

export const functionInitializer = (
  declaration: ts.VariableDeclaration
): Option.Option<FunctionInitializer> =>
  Option.fromNullable(declaration.initializer).pipe(Option.filter(isFunctionInitializer))

export const unwrapExpression = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression)
    ? unwrapExpression(expression.expression)
    : expression

export const transparentWrapperKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.AsExpression
])

type TransparentWrapper = ts.ParenthesizedExpression | ts.SatisfiesExpression | ts.AsExpression

const isTransparentWrapper = (expression: ts.Expression): expression is TransparentWrapper =>
  transparentWrapperKinds.has(expression.kind)

export const unwrapTransparentExpression = (expression: ts.Expression): ts.Expression =>
  isTransparentWrapper(expression)
    ? unwrapTransparentExpression(expression.expression)
    : expression

export const isProjectSourceFile = (sourceFile: ts.SourceFile): boolean => {
  const isSkippableSourceFile = [
    sourceFile.isDeclarationFile,
    sourceFile.fileName.replaceAll("\\", "/").includes("/node_modules/")
  ].some(Boolean)

  return !isSkippableSourceFile
}

export const unwrapSingleStatementBlock = (statement: ts.Statement): ts.Statement => {
  if (!ts.isBlock(statement)) {
    return statement
  }

  const hasOneStatement = statement.statements.length === 1

  return hasOneStatement ? statement.statements[0] : statement
}
