import { Array, Function, HashSet, pipe, Option } from "effect"
import * as ts from "typescript"
/**
 * FunctionInitializer is the shared modifiers, body, name, asteriskToken
 * contract used by functionInitializer, isFunctionInitializer, and
 * hasParameters.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export type FunctionInitializer = ts.ArrowFunction | ts.FunctionExpression

/**
 * ReturnTypeDeclaration is the shared name, typeParameters, parameters, type
 * contract used by RawObjectTarget, isReturnTypeDeclaration,
 * isUndefinedReturnTypeDeclaration, hasUndefinedReturnType, and
 * hasAnyReturnType.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
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
  pipe(Option.fromNullable(node.name), Option.getOrElse(Function.constant(node)))

export const resolvedSymbolAt =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): Option.Option<ts.Symbol> =>
    pipe(
      checker.getSymbolAtLocation(node),
      Option.fromNullable,
      Option.map((symbol) => {
        const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

        return isAlias ? checker.getAliasedSymbol(symbol) : symbol
      })
    )

export const isFunctionInitializer = (node: ts.Node): node is FunctionInitializer =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node)

export const hasParameters = (initializer: FunctionInitializer): boolean =>
  initializer.parameters.length > 0

export const isReturnTypeDeclaration = (node: ts.Node): node is ReturnTypeDeclaration => {
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
  pipe(Option.fromNullable(declaration.initializer), Option.filter(isFunctionInitializer))

export const conciseArrowBody = (arrowFunction: ts.ArrowFunction): Option.Option<ts.Expression> =>
  ts.isBlock(arrowFunction.body) ? Option.none() : Option.some(arrowFunction.body)

export const unwrapExpression = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression) ? unwrapExpression(expression.expression) : expression

export const transparentWrapperKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.AsExpression
)

/**
 * TransparentWrapper is the compiler syntax protocol handled by
 * transparent-expression unwrapping.
 *
 * @remarks
 *   It remains explicit because parenthesized, satisfies, and assertion
 *   expressions share one recursive operation; removing it would repeat the
 *   union and let accepted cases drift.
 * @modelRole protocol
 */
export type TransparentWrapper =
  ts.ParenthesizedExpression | ts.SatisfiesExpression | ts.AsExpression

export const unwrapTransparentExpression = (expression: ts.Expression): ts.Expression =>
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

export const outermostTransparentWrapper = (expression: ts.Expression): ts.Expression => {
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

export const unwrapSingleStatementBlock = (statement: ts.Statement): ts.Statement => {
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
  const sourceFiles = Array.map(declarations, (declaration) => declaration.getSourceFile())

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

export const returnTypeDeclarationKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.FunctionType,
  ts.SyntaxKind.GetAccessor
)

export const containsUndefinedKeyword = (node: ts.Node): boolean => {
  const isUndefinedKeyword = node.kind === ts.SyntaxKind.UndefinedKeyword
  const childContainsUndefinedKeyword = ts.forEachChild(node, containsUndefinedKeyword) === true
  const conditions = Array.make(isUndefinedKeyword, childContainsUndefinedKeyword)

  return Array.some(conditions, Boolean)
}

export const containsUndefinedType = (typeNode: Option.Option<ts.TypeNode>): boolean =>
  Option.exists(typeNode, containsUndefinedKeyword)

export const hasUndefinedReturnType = (decl: ReturnTypeDeclaration): boolean =>
  pipe(Option.fromNullable(decl.type), containsUndefinedType)

export const isUndefinedReturnTypeDeclaration = (node: ts.Node): node is ReturnTypeDeclaration => {
  const returnTypeDecl = Option.liftPredicate(isReturnTypeDeclaration)(node)

  return Option.exists(returnTypeDecl, hasUndefinedReturnType)
}

const containsAnyKeyword = (node: ts.Node): boolean => {
  const isAnyKeyword = node.kind === ts.SyntaxKind.AnyKeyword
  const anyChild = ts.forEachChild(node, (child) => (containsAnyKeyword(child) ? child : void 0))
  const hasAnyDescendant = pipe(Option.fromNullable(anyChild), Option.isSome)
  const ambientConditions = Array.make(isAnyKeyword, hasAnyDescendant)
  return Array.some(ambientConditions, Boolean)
}

export const hasAnyReturnType = (decl: ReturnTypeDeclaration): boolean =>
  pipe(Option.fromNullable(decl.type), Option.exists(containsAnyKeyword))
