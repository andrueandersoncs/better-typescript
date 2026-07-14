import { Array, Function, HashSet, pipe, Option } from "effect"
import * as ts from "typescript"
/**
 * FunctionInitializer is the shared modifiers, body, name, asteriskToken contract used
 * by functionInitializer, isFunctionInitializer, and hasParameters.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export type FunctionInitializer = ts.ArrowFunction | ts.FunctionExpression

/**
 * ReturnTypeDeclaration is the shared name, typeParameters, parameters, type contract
 * used by RawObjectTarget, isReturnTypeDeclaration, and
 * isUndefinedReturnTypeDeclaration.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
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
  const isFunctionDeclaration = ts.isFunctionDeclaration(node)
  const isFunctionExpression = ts.isFunctionExpression(node)
  const isArrowFunction = ts.isArrowFunction(node)
  const isMethodDeclaration = ts.isMethodDeclaration(node)
  const isMethodSignature = ts.isMethodSignature(node)
  const isCallSignatureDeclaration = ts.isCallSignatureDeclaration(node)
  const isFunctionTypeNode = ts.isFunctionTypeNode(node)
  const isGetAccessorDeclaration = ts.isGetAccessorDeclaration(node)

  const conditions = Array.make(
    isFunctionDeclaration,
    isFunctionExpression,
    isArrowFunction,
    isMethodDeclaration,
    isMethodSignature,
    isCallSignatureDeclaration,
    isFunctionTypeNode,
    isGetAccessorDeclaration
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

/**
 * TransparentWrapper names the compiler syntax protocol handled by
 * unwrapTransparentExpression.
 *
 * @modelRole protocol
 * @remarks It remains explicit because those algorithms must agree on the accepted
 * syntax vocabulary. Removing it would repeat the compiler-node union in each matcher
 * and let their accepted cases drift.
 */
type TransparentWrapper =
  ts.ParenthesizedExpression | ts.SatisfiesExpression | ts.AsExpression

export const unwrapTransparentExpression = (
  expression: ts.Expression
): ts.Expression =>
  HashSet.has(transparentWrapperKinds, expression.kind)
    ? unwrapTransparentExpression((expression as TransparentWrapper).expression)
    : expression

export const unwrapCarrier = (expression: ts.Expression): ts.Expression =>
  ts.isNonNullExpression(expression)
    ? unwrapCarrier(expression.expression)
    : unwrapTransparentExpression(expression)

export const unwrapCallee = (expression: ts.Expression): ts.Expression => {
  const call = Option.liftPredicate(ts.isCallExpression)(expression)

  return Option.match(call, {
    onNone: Function.constant(expression),
    onSome: (node) => unwrapCallee(node.expression)
  })
}

export const outermostTransparentWrapper = (
  expression: ts.Expression
): ts.Expression => {
  const parent = expression.parent
  const parentIsTransparent = HashSet.has(transparentWrapperKinds, parent.kind)

  if (!parentIsTransparent) {
    return expression
  }

  const parentExpression = Option.liftPredicate(ts.isExpression)(parent)

  return Option.match(parentExpression, {
    onNone: Function.constant(expression),
    onSome: outermostTransparentWrapper
  })
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

const exitStatementKinds = HashSet.make(
  ts.SyntaxKind.BreakStatement,
  ts.SyntaxKind.ContinueStatement,
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ThrowStatement
)

export const alwaysExitsScope = (statement: ts.Statement): boolean => {
  if (ts.isBlock(statement)) {
    const statements = statement.statements
    const lastIndex = statements.length - 1
    const lastStmt = Option.fromNullable(statements[lastIndex])

    return Option.exists(lastStmt, alwaysExitsScope)
  }

  return HashSet.has(exitStatementKinds, statement.kind)
}

export const isExtendsClause = (clause: ts.HeritageClause): boolean =>
  clause.token === ts.SyntaxKind.ExtendsKeyword

export const isProjectFile = (sourceFile: ts.SourceFile): boolean =>
  !sourceFile.fileName.replaceAll("\\", "/").includes("/node_modules/")

export const isFirstPartySymbol = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.getDeclarations() ?? Array.empty()

  const sourceFiles = Array.map(declarations, (declaration) =>
    declaration.getSourceFile()
  )

  return Array.some(sourceFiles, isProjectFile)
}

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
