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

const fallbackToNode = (node: ts.Node) => (): ts.Node => node

export const namedNodeReportTarget = (node: ts.NamedDeclaration): ts.Node =>
  Option.fromNullable(node.name).pipe(Option.getOrElse(fallbackToNode(node)))

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

export const hasNoElseBranch = (ifStatement: ts.IfStatement): boolean => {
  const elseStatement = Option.fromNullable(ifStatement.elseStatement)

  return Option.isNone(elseStatement)
}

export const lastStatement = (block: ts.Block): Option.Option<ts.Statement> =>
  Option.fromNullable(block.statements[block.statements.length - 1])

const exitStatementKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.BreakStatement,
  ts.SyntaxKind.ContinueStatement,
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ThrowStatement
])

const blockExitsScope = (block: ts.Block): boolean => {
  const finalStatement = lastStatement(block)

  return Option.exists(finalStatement, alwaysExitsScope)
}

export const alwaysExitsScope = (statement: ts.Statement): boolean =>
  ts.isBlock(statement) ? blockExitsScope(statement) : exitStatementKinds.has(statement.kind)
