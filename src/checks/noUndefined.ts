import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { combineAll, nodeSubscriptions } from "../engine/check.js"
import { isReturnTypeDeclaration, unwrapExpression } from "./support/tsNode.js"
import type { ReturnTypeDeclaration } from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

type UndefinedReturnExpression = ts.ReturnStatement | ts.ArrowFunction
type UndefinedTypeDeclaration = ts.PropertySignature | ts.MappedTypeNode

type UndefinedUsageKind =
  | "parameter"
  | "return-type"
  | "return-expression"
  | "type-declaration"
  | "comparison"

const optionHint =
  "Use Effect's Option module to model optional values, and convert nullable boundaries " +
  "with Option.fromNullable (incoming) and Option.getOrUndefined (outgoing). When a " +
  "third-party signature forces undefined on a callback, keep the callback inline or " +
  "annotate it with the library's own callback type so the undefined stays in the " +
  "library's declaration, not yours."

const isUndefinedIdentifier = (identifier: ts.Identifier): boolean =>
  identifier.text === "undefined"

const isUndefinedExpression = (expression: ts.Expression): boolean => {
  const unwrapped = unwrapExpression(expression)
  const identifier = Option.liftPredicate(ts.isIdentifier)(unwrapped)

  return Option.exists(identifier, isUndefinedIdentifier)
}

const containsUndefinedKeyword = (node: ts.Node): boolean => {
  const isUndefinedKeyword = node.kind === ts.SyntaxKind.UndefinedKeyword
  const childContainsUndefinedKeyword =
    ts.forEachChild(node, containsUndefinedKeyword) === true

  return [isUndefinedKeyword, childContainsUndefinedKeyword].some(Boolean)
}

const containsUndefinedType = (typeNode: Option.Option<ts.TypeNode>): boolean =>
  Option.exists(typeNode, containsUndefinedKeyword)

const equalityComparisonOperators = HashSet.make(
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

const isEqualityWithUndefined = (expr: ts.BinaryExpression): boolean => {
  const isEqualityComparison = HashSet.has(
    equalityComparisonOperators,
    expr.operatorToken.kind
  )
  const hasUndefinedOperand = [expr.left, expr.right].some(
    isUndefinedExpression
  )

  return [isEqualityComparison, hasUndefinedOperand].every(Boolean)
}

const isUndefinedComparison = (node: ts.Node): node is ts.BinaryExpression => {
  const binaryExpr = Option.liftPredicate(ts.isBinaryExpression)(node)

  return Option.exists(binaryExpr, isEqualityWithUndefined)
}

const parameterAcceptsUndefined = (param: ts.ParameterDeclaration): boolean => {
  const hasQuestionToken = pipe(
    param.questionToken,
    Option.fromNullable,
    Option.isSome
  )
  const typeNode = Option.fromNullable(param.type)
  const hasUndefinedType = containsUndefinedType(typeNode)

  return hasQuestionToken || hasUndefinedType
}

const isParameterAcceptingUndefined = (
  node: ts.Node
): node is ts.ParameterDeclaration =>
  pipe(
    Option.liftPredicate(ts.isParameter)(node),
    Option.exists(parameterAcceptsUndefined)
  )

const hasUndefinedReturnType = (decl: ReturnTypeDeclaration): boolean => {
  const typeNode = Option.fromNullable(decl.type)

  return containsUndefinedType(typeNode)
}

const isUndefinedReturnTypeDeclaration = (
  node: ts.Node
): node is ReturnTypeDeclaration => {
  const returnTypeDecl = Option.liftPredicate(isReturnTypeDeclaration)(node)

  return Option.exists(returnTypeDecl, hasUndefinedReturnType)
}

const getReturnExpression = (
  stmt: ts.ReturnStatement
): Option.Option<ts.Expression> => Option.fromNullable(stmt.expression)

const getArrowExpressionBody = (
  fn: ts.ArrowFunction
): Option.Option<ts.Expression> =>
  ts.isBlock(fn.body) ? Option.none() : Option.some(fn.body)

const isUndefinedReturnExpression = (
  node: ts.Node
): node is UndefinedReturnExpression => {
  const returnStmt = Option.liftPredicate(ts.isReturnStatement)(node)
  const returnExprValue = Option.flatMap(returnStmt, getReturnExpression)
  const isUndefinedReturn = Option.exists(
    returnExprValue,
    isUndefinedExpression
  )

  const arrowFn = Option.liftPredicate(ts.isArrowFunction)(node)
  const arrowBody = Option.flatMap(arrowFn, getArrowExpressionBody)
  const isUndefinedArrow = Option.exists(arrowBody, isUndefinedExpression)

  return [isUndefinedReturn, isUndefinedArrow].some(Boolean)
}

const isNotMinusToken = (questionToken: ts.Node): boolean =>
  questionToken.kind !== ts.SyntaxKind.MinusToken

const propertySignatureAcceptsUndefined = (
  node: ts.PropertySignature
): boolean => {
  const hasQuestionToken = pipe(
    node.questionToken,
    Option.fromNullable,
    Option.isSome
  )
  const typeNode = Option.fromNullable(node.type)
  const hasUndefinedType = containsUndefinedType(typeNode)

  return hasQuestionToken || hasUndefinedType
}

const mappedTypeAcceptsUndefined = (node: ts.MappedTypeNode): boolean => {
  const questionToken = Option.fromNullable(node.questionToken)
  const hasQuestionToken = Option.exists(questionToken, isNotMinusToken)
  const typeNode = Option.fromNullable(node.type)
  const hasUndefinedType = containsUndefinedType(typeNode)

  return hasQuestionToken || hasUndefinedType
}

const isUndefinedTypeDeclaration = (
  node: ts.Node
): node is UndefinedTypeDeclaration => {
  const isPropertyWithUndefined = pipe(
    Option.liftPredicate(ts.isPropertySignature)(node),
    Option.exists(propertySignatureAcceptsUndefined)
  )
  const isMappedWithUndefined = pipe(
    Option.liftPredicate(ts.isMappedTypeNode)(node),
    Option.exists(mappedTypeAcceptsUndefined)
  )

  return isPropertyWithUndefined || isMappedWithUndefined
}

const undefinedMessages: Record<UndefinedUsageKind, string> = {
  parameter: "Avoid function parameters that accept undefined.",
  "return-type": "Avoid function return types that include undefined.",
  "return-expression": "Avoid returning undefined from functions.",
  "type-declaration":
    "Avoid optional or undefined properties in type declarations.",
  comparison: "Avoid comparing values against undefined."
}

// Each subscription applies this factory with its kind; the resulting context stage runs once per file, so match and message are shared by every node that subscription feeds to matches.
const undefinedUsageMatches =
  (kind: UndefinedUsageKind) => (context: CheckContext) => {
    const match = detection(context)
    const message = undefinedMessages[kind]

    const matches = (node: ts.Node): ReadonlyArray<Detection> => [
      match({ node, message, hint: optionHint })
    ]

    return matches
  }

const returnTypeDeclarationKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.FunctionType,
  ts.SyntaxKind.GetAccessor
]

const parameterListeners = nodeSubscriptions([ts.SyntaxKind.Parameter])(
  isParameterAcceptingUndefined
)(undefinedUsageMatches("parameter"))

const returnTypeListeners = nodeSubscriptions(returnTypeDeclarationKinds)(
  isUndefinedReturnTypeDeclaration
)(undefinedUsageMatches("return-type"))

const returnExpressionListeners = nodeSubscriptions([
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ArrowFunction
])(isUndefinedReturnExpression)(undefinedUsageMatches("return-expression"))

const typeDeclarationListeners = nodeSubscriptions([
  ts.SyntaxKind.PropertySignature,
  ts.SyntaxKind.MappedType
])(isUndefinedTypeDeclaration)(undefinedUsageMatches("type-declaration"))

const comparisonListeners = nodeSubscriptions([ts.SyntaxKind.BinaryExpression])(
  isUndefinedComparison
)(undefinedUsageMatches("comparison"))

const check = combineAll([
  parameterListeners,
  returnTypeListeners,
  returnExpressionListeners,
  typeDeclarationListeners,
  comparisonListeners
])

export const noUndefined: Check = check
