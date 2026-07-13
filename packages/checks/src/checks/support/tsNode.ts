import { Array, Function, HashSet, pipe, Option } from "effect"
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

export const namedDetectionTarget = (node: ts.NamedDeclaration): ts.Node =>
  pipe(
    Option.fromNullable(node.name),
    Option.getOrElse(Function.constant(node))
  )

export const isFunctionInitializer = (
  node: ts.Node
): node is FunctionInitializer =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node)

export const isReturnTypeDeclaration = (
  node: ts.Node
): node is ReturnTypeDeclaration => {
  const conditions = Array.make(
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node),
    ts.isMethodSignature(node),
    ts.isCallSignatureDeclaration(node),
    ts.isFunctionTypeNode(node),
    ts.isGetAccessorDeclaration(node)
  )

  return Array.some(conditions, Boolean)
}

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

export const returnedExpression = (
  statement: ts.ReturnStatement
): Option.Option<ts.Expression> => Option.fromNullable(statement.expression)

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

export const unwrapSingleStatementBlock = (
  statement: ts.Statement
): ts.Statement => {
  if (!ts.isBlock(statement)) {
    return statement
  }

  const hasOneStatement = statement.statements.length === 1

  return hasOneStatement ? statement.statements[0] : statement
}

export const hasNoElseBranch = (ifStatement: ts.IfStatement): boolean =>
  pipe(Option.fromNullable(ifStatement.elseStatement), Option.isNone)

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

export const declarationSourceFile = (
  declaration: ts.Declaration
): ts.SourceFile => declaration.getSourceFile()

export const isFirstPartySymbol = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.getDeclarations() ?? Array.empty()
  const sourceFiles = Array.map(declarations, declarationSourceFile)

  return Array.some(sourceFiles, isProjectFile)
}

export const typeNameIdentifier = (
  ref: ts.TypeReferenceNode
): Option.Option<ts.Identifier> =>
  Option.liftPredicate(ts.isIdentifier)(ref.typeName)

export const isSameNode =
  (node: ts.Node) =>
  (candidate: ts.Node): boolean =>
    candidate === node

const isExportKeyword = (modifier: ts.Modifier): boolean =>
  modifier.kind === ts.SyntaxKind.ExportKeyword

export const hasExportModifier = (statement: ts.Statement): boolean => {
  const modifiers = ts.canHaveModifiers(statement)
    ? (ts.getModifiers(statement) ?? Array.empty())
    : Array.empty()

  return Array.some(modifiers, isExportKeyword)
}

const isDeclareKeyword = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.DeclareKeyword

// Treat ambient declarations as external because they mirror a dependency's contract rather than an author choice.
export const isInAmbientContext = (node: ts.Node): boolean => {
  const sourceFile = node.getSourceFile()

  const modifiers = ts.canHaveModifiers(node)
    ? (ts.getModifiers(node) ?? Array.empty())
    : Array.empty()

  const hasDeclareModifier = Array.some(modifiers, isDeclareKeyword)
  const parent = Option.fromNullable<ts.Node>(node.parent)
  const parentIsAmbient = Option.exists(parent, isInAmbientContext)

  const ambientConditions = Array.make(
    sourceFile.isDeclarationFile,
    hasDeclareModifier,
    parentIsAmbient
  )

  return Array.some(ambientConditions, Boolean)
}
