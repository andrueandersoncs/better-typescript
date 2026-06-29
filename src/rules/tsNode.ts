import { HashSet, Option, pipe } from "effect"
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
  pipe(Option.fromNullable(node.name), Option.getOrElse(fallbackToNode(node)))

export const isFunctionInitializer = (
  node: ts.Node
): node is FunctionInitializer =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node)

export const isReturnTypeDeclaration = (
  node: ts.Node
): node is ReturnTypeDeclaration =>
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
  pipe(
    Option.fromNullable(declaration.initializer),
    Option.filter(isFunctionInitializer)
  )

export const returnTypeNode = (
  decl: ReturnTypeDeclaration
): Option.Option<ts.TypeNode> => Option.fromNullable(decl.type)

export const conciseArrowBody = (
  arrowFunction: ts.ArrowFunction
): Option.Option<ts.Expression> =>
  ts.isBlock(arrowFunction.body)
    ? Option.none()
    : Option.some(arrowFunction.body)

export const unwrapExpression = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression)
    ? unwrapExpression(expression.expression)
    : expression

export const transparentWrapperKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.AsExpression
)

type TransparentWrapper =
  ts.ParenthesizedExpression | ts.SatisfiesExpression | ts.AsExpression

export const unwrapTransparentExpression = (
  expression: ts.Expression
): ts.Expression =>
  HashSet.has(transparentWrapperKinds, expression.kind)
    ? unwrapTransparentExpression((expression as TransparentWrapper).expression)
    : expression

export const isTransparentParent = (node: ts.Node): node is ts.Expression =>
  HashSet.has(transparentWrapperKinds, node.kind)

export const outermostTransparentWrapper = (
  expression: ts.Expression
): ts.Expression =>
  isTransparentParent(expression.parent)
    ? outermostTransparentWrapper(expression.parent)
    : expression

export const isProjectSourceFile = (sourceFile: ts.SourceFile): boolean => {
  const isSkippableSourceFile = [
    sourceFile.isDeclarationFile,
    sourceFile.fileName.replaceAll("\\", "/").includes("/node_modules/")
  ].some(Boolean)

  return !isSkippableSourceFile
}

export const unwrapSingleStatementBlock = (
  statement: ts.Statement
): ts.Statement => {
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

const exitStatementKinds = HashSet.make(
  ts.SyntaxKind.BreakStatement,
  ts.SyntaxKind.ContinueStatement,
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ThrowStatement
)

export const alwaysExitsScope = (statement: ts.Statement): boolean => {
  if (ts.isBlock(statement)) {
    const lastStmt = lastStatement(statement)

    return Option.exists(lastStmt, alwaysExitsScope)
  }

  return HashSet.has(exitStatementKinds, statement.kind)
}

export const isExtendsClause = (clause: ts.HeritageClause): boolean =>
  clause.token === ts.SyntaxKind.ExtendsKeyword

export const isProjectFile = (sourceFile: ts.SourceFile): boolean =>
  !sourceFile.fileName.replaceAll("\\", "/").includes("/node_modules/")

const declarationFile = (declaration: ts.Declaration): ts.SourceFile =>
  declaration.getSourceFile()

export const isFirstPartySymbol = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.getDeclarations() ?? []
  const sourceFiles = declarations.map(declarationFile)

  return sourceFiles.some(isProjectFile)
}
