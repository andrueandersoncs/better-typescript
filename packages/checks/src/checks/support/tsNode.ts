import { Array, Function, HashSet, Match, pipe, Option, Struct } from "effect"
import * as ts from "typescript"
// FunctionInitializer is the shared function shape because owners must agree.
export type FunctionInitializer = ts.ArrowFunction | ts.FunctionExpression

// FunctionDefinition names executable forms because call edges need one owner.
export type FunctionDefinition =
  ts.ArrowFunction | ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration

// DeclarationStatement is shared declaration syntax because blank-line checks need one vocabulary.
export type DeclarationStatement =
  | ts.VariableStatement
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
  | ts.ModuleDeclaration

// StatementContainer is shared container syntax because neighbor lookup needs one operation.
export type StatementContainer =
  ts.SourceFile | ts.Block | ts.ModuleBlock | ts.CaseClause | ts.DefaultClause

// ReturnedExpressionNode is the return/arrow contract because both checks need one vocabulary.
export type ReturnedExpressionNode = ts.ReturnStatement | ts.ArrowFunction

// NewOrTypeReferenceNode is the new/type-ref contract because both checks need one vocabulary.
export type NewOrTypeReferenceNode = ts.NewExpression | ts.TypeReferenceNode

// CallLikeExpression is the shared call/construct shape because both consume arguments alike.
export type CallLikeExpression = ts.CallExpression | ts.NewExpression

// ReturnTypeDeclaration is one typed callable contract because owners must agree.
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
  pipe(Option.fromNullishOr(node.name), Option.getOrElse(Function.constant(node)))

export const resolvedSymbolAt = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(
    checker.getSymbolAtLocation(node),
    Option.fromNullishOr,
    Option.map((symbol) => {
      const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

      return isAlias ? checker.getAliasedSymbol(symbol) : symbol
    })
  )

export const isFunctionInitializer = (node: ts.Node): node is FunctionInitializer =>
  ts.isArrowFunction(node) || ts.isFunctionExpression(node)

export const isFunctionDefinition = (node: ts.Node): node is FunctionDefinition => {
  const isFunctionDeclaration = ts.isFunctionDeclaration(node)
  const isFunctionExpression = ts.isFunctionExpression(node)
  const isArrowFunction = ts.isArrowFunction(node)
  const isMethodDeclaration = ts.isMethodDeclaration(node)

  const conditions = Array.make(
    isFunctionDeclaration,
    isFunctionExpression,
    isArrowFunction,
    isMethodDeclaration
  )

  return Array.some(conditions, Boolean)
}

export const isDeclarationStatement = (node: ts.Node): node is DeclarationStatement => {
  const isVariableStatement = ts.isVariableStatement(node)
  const isFunctionDeclaration = ts.isFunctionDeclaration(node)
  const isClassDeclaration = ts.isClassDeclaration(node)
  const isInterfaceDeclaration = ts.isInterfaceDeclaration(node)
  const isTypeAliasDeclaration = ts.isTypeAliasDeclaration(node)
  const isEnumDeclaration = ts.isEnumDeclaration(node)
  const isModuleDeclaration = ts.isModuleDeclaration(node)

  const conditions = Array.make(
    isVariableStatement,
    isFunctionDeclaration,
    isClassDeclaration,
    isInterfaceDeclaration,
    isTypeAliasDeclaration,
    isEnumDeclaration,
    isModuleDeclaration
  )

  return Array.some(conditions, Boolean)
}

export const isStatementContainer = (node: ts.Node): node is StatementContainer => {
  const isSourceFile = ts.isSourceFile(node)
  const isBlock = ts.isBlock(node)
  const isModuleBlock = ts.isModuleBlock(node)
  const isCaseClause = ts.isCaseClause(node)
  const isDefaultClause = ts.isDefaultClause(node)
  const conditions = Array.make(isSourceFile, isBlock, isModuleBlock, isCaseClause, isDefaultClause)

  return Array.some(conditions, Boolean)
}

export const isReturnedExpressionNode = (node: ts.Node): node is ReturnedExpressionNode =>
  ts.isReturnStatement(node) || ts.isArrowFunction(node)

export const isCallLikeExpression = (node: ts.Node): node is CallLikeExpression =>
  ts.isCallExpression(node) || ts.isNewExpression(node)

const expressionBodiedArrow = (definition: FunctionDefinition) =>
  pipe(
    Option.liftPredicate(ts.isArrowFunction)(definition),
    Option.map(Struct.get("body")),
    Option.filter((body): body is ts.Expression => !ts.isBlock(body))
  )

export const singleStatementReturnExpression = (body: ts.Block) =>
  pipe(
    body.statements,
    Option.liftPredicate((statements) => statements.length === 1),
    Option.flatMap(Array.head),
    Option.filter(ts.isReturnStatement),
    Option.flatMap((statement) => Option.fromNullishOr(statement.expression))
  )

const singleReturnExpression = (definition: FunctionDefinition) =>
  pipe(
    Option.fromNullishOr(definition.body),
    Option.filter(ts.isBlock),
    Option.map((body) => Array.filter(body.statements, ts.isReturnStatement)),
    Option.filter((returns) => returns.length === 1),
    Option.flatMap((returns) => Option.fromNullishOr(returns[0].expression))
  )

export const returnedExpression = (definition: FunctionDefinition) => {
  const blockReturn = singleReturnExpression(definition)

  return pipe(expressionBodiedArrow(definition), Option.orElse(Function.constant(blockReturn)))
}

export const hasParameters = (initializer: FunctionInitializer) => initializer.parameters.length > 0

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

export const functionInitializer = (declaration: ts.VariableDeclaration) =>
  pipe(Option.fromNullishOr(declaration.initializer), Option.filter(isFunctionInitializer))

export const conciseArrowBody = (arrowFunction: ts.ArrowFunction): Option.Option<ts.Expression> =>
  ts.isBlock(arrowFunction.body) ? Option.none() : Option.some(arrowFunction.body)

export const unwrapExpression = (expression: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(expression) ? unwrapExpression(expression.expression) : expression

export const transparentWrapperKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.AsExpression
)

// TransparentWrapper is shared unwrap syntax because paren/satisfies/assert share one walk.
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

export const unwrapSingleStatementBlock = (statement: ts.Statement) => {
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
    const lastStmt = Option.fromNullishOr(statements[lastIndex])

    return Option.exists(lastStmt, alwaysExitsScope)
  }

  return HashSet.has(exitStatementKinds, statement.kind)
}

export const isExtendsClause = (clause: ts.HeritageClause) =>
  clause.token === ts.SyntaxKind.ExtendsKeyword

export const isProjectFile = (sourceFile: ts.SourceFile) =>
  !sourceFile.fileName.replaceAll("\\", "/").includes("/node_modules/")

export const isFirstPartySymbol = (symbol: ts.Symbol) => {
  const declarations = symbol.getDeclarations() ?? Array.empty()
  const sourceFiles = Array.map(declarations, (declaration) => declaration.getSourceFile())

  return Array.some(sourceFiles, isProjectFile)
}

const isExportKeyword = (modifier: ts.Modifier): boolean =>
  modifier.kind === ts.SyntaxKind.ExportKeyword

export const hasExportModifier = (statement: ts.Statement) => {
  const modifiers = ts.canHaveModifiers(statement)
    ? (ts.getModifiers(statement) ?? Array.empty())
    : Array.empty()

  return Array.some(modifiers, isExportKeyword)
}

const isDeclareKeyword = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.DeclareKeyword

// Treat ambient decls as external because they mirror a dependency contract, not an author choice.
export const isInAmbientContext = (node: ts.Node): boolean => {
  const sourceFile = node.getSourceFile()

  const modifiers = ts.canHaveModifiers(node)
    ? (ts.getModifiers(node) ?? Array.empty())
    : Array.empty()

  const hasDeclareModifier = Array.some(modifiers, isDeclareKeyword)
  const parent = Option.fromNullishOr<ts.Node>(node.parent)
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

export const containsUndefinedType = (typeNode: Option.Option<ts.TypeNode>) =>
  Option.exists(typeNode, containsUndefinedKeyword)

export const hasUndefinedReturnType = (decl: ReturnTypeDeclaration) =>
  pipe(Option.fromNullishOr(decl.type), containsUndefinedType)

export const isUndefinedReturnTypeDeclaration = (node: ts.Node): node is ReturnTypeDeclaration => {
  const returnTypeDecl = Option.liftPredicate(isReturnTypeDeclaration)(node)

  return Option.exists(returnTypeDecl, hasUndefinedReturnType)
}

const containsAnyKeyword = (node: ts.Node): boolean => {
  const isAnyKeyword = node.kind === ts.SyntaxKind.AnyKeyword
  const anyChild = ts.forEachChild(node, (child) => (containsAnyKeyword(child) ? child : void 0))
  const hasAnyDescendant = pipe(Option.fromNullishOr(anyChild), Option.isSome)
  const ambientConditions = Array.make(isAnyKeyword, hasAnyDescendant)
  return Array.some(ambientConditions, Boolean)
}

export const hasAnyReturnType = (decl: ReturnTypeDeclaration) => {
  const returnType = Option.fromNullishOr(decl.type)

  return Option.exists(returnType, containsAnyKeyword)
}

export const propertyNameText = (name: ts.PropertyName) =>
  pipe(
    Match.value(name),
    Match.when(ts.isIdentifier, (identifier) => Option.some(identifier.text)),
    Match.when(ts.isStringLiteralLike, (literal) => Option.some(literal.text)),
    Match.when(ts.isNumericLiteral, (literal) => Option.some(literal.text)),
    Match.when(ts.isComputedPropertyName, (computed) =>
      pipe(
        Option.liftPredicate(ts.isStringLiteralLike)(computed.expression),
        Option.map(Struct.get("text"))
      )
    ),
    Match.orElse(() => Option.none())
  )

export const bindingNameText = (name: ts.BindingName) =>
  pipe(
    Match.value(name),
    Match.when(ts.isIdentifier, (identifier) => Option.some(identifier.text)),
    Match.orElse(() => Option.none())
  )

export const callExpressionOf = Option.liftPredicate(ts.isCallExpression)
