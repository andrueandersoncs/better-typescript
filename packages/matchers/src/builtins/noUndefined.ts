import { Array, Function, HashSet, Option, pipe, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import type { ReturnedExpressionNode } from "../support/tsNode.js"
import {
  containsUndefinedType,
  isUndefinedReturnTypeDeclaration,
  returnTypeDeclarationKinds,
  unwrapExpression
} from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"
import { makeMatcherFromSubscriptions, nodeSubscriptions } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"

// UndefinedTypeDeclaration is a local syntax union because matchers need one narrowed node shape.
export type UndefinedTypeDeclaration = ts.PropertySignature | ts.MappedTypeNode

const undefinedUsageKinds = Array.make<
  ["parameter", "return-type", "return-expression", "type-declaration", "comparison"]
>("parameter", "return-type", "return-expression", "type-declaration", "comparison")

// UndefinedUsageKind classifies undefined sites because usage advice differs.
export const UndefinedUsageKind = Schema.Literals(undefinedUsageKinds)

export type UndefinedUsageKind = typeof UndefinedUsageKind.Type

// NoUndefinedFact classifies undefined usage because guidance varies by site.
export const NoUndefinedFact = Schema.Struct({
  kind: UndefinedUsageKind
})

export interface NoUndefinedFact extends Schema.Schema.Type<typeof NoUndefinedFact> {}

const isUndefinedIdentifier = flow(
  Struct.get<ts.Identifier, "text">("text"),
  strictEqual("undefined")
)

const isUndefinedExpression = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)
  const identifier = Option.liftPredicate(ts.isIdentifier)(unwrapped)

  return Option.exists(identifier, isUndefinedIdentifier)
}

const equalityComparisonOperators = HashSet.make(
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

const isEqualityWithUndefined = (expr: ts.BinaryExpression) => {
  const isEqualityComparison = HashSet.has(equalityComparisonOperators, expr.operatorToken.kind)
  const comparisonOperands = Array.make(expr.left, expr.right)
  const hasUndefinedOperand = Array.some(comparisonOperands, isUndefinedExpression)
  const checks = Array.make(isEqualityComparison, hasUndefinedOperand)
  return Array.every(checks, Boolean)
}

const isUndefinedComparison = (node: ts.Node): node is ts.BinaryExpression => {
  const binaryExpr = Option.liftPredicate(ts.isBinaryExpression)(node)

  return Option.exists(binaryExpr, isEqualityWithUndefined)
}

const parameterAcceptsUndefined = (param: ts.ParameterDeclaration) => {
  const hasQuestionToken = pipe(param.questionToken, Option.fromNullishOr, Option.isSome)
  const typeNode = Option.fromNullishOr(param.type)
  const hasUndefinedType = containsUndefinedType(typeNode)

  return hasQuestionToken || hasUndefinedType
}

const isParameterAcceptingUndefined = (node: ts.Node): node is ts.ParameterDeclaration =>
  pipe(Option.liftPredicate(ts.isParameter)(node), Option.exists(parameterAcceptsUndefined))

const getReturnExpression = (stmt: ts.ReturnStatement) => Option.fromNullishOr(stmt.expression)

const getArrowExpressionBody = (fn: ts.ArrowFunction): Option.Option<ts.Expression> =>
  ts.isBlock(fn.body) ? Option.none() : Option.some(fn.body)

const isUndefinedReturnedExpression = (node: ts.Node): node is ReturnedExpressionNode => {
  const returnStmt = Option.liftPredicate(ts.isReturnStatement)(node)
  const returnExprValue = Option.flatMap(returnStmt, getReturnExpression)
  const isUndefinedReturn = Option.exists(returnExprValue, isUndefinedExpression)
  const arrowFn = Option.liftPredicate(ts.isArrowFunction)(node)
  const arrowBody = Option.flatMap(arrowFn, getArrowExpressionBody)
  const isUndefinedArrow = Option.exists(arrowBody, isUndefinedExpression)
  const checks = Array.make(isUndefinedReturn, isUndefinedArrow)
  return Array.some(checks, Boolean)
}

const isNotMinusToken = (questionToken: ts.Node) => questionToken.kind !== ts.SyntaxKind.MinusToken

const propertySignatureAcceptsUndefined = (node: ts.PropertySignature) => {
  const hasQuestionToken = pipe(node.questionToken, Option.fromNullishOr, Option.isSome)
  const typeNode = Option.fromNullishOr(node.type)
  const hasUndefinedType = containsUndefinedType(typeNode)

  return hasQuestionToken || hasUndefinedType
}

const mappedTypeAcceptsUndefined = (node: ts.MappedTypeNode) => {
  const questionToken = Option.fromNullishOr(node.questionToken)
  const hasQuestionToken = Option.exists(questionToken, isNotMinusToken)
  const typeNode = Option.fromNullishOr(node.type)
  const hasUndefinedType = containsUndefinedType(typeNode)

  return hasQuestionToken || hasUndefinedType
}

const isUndefinedTypeDeclaration = (node: ts.Node): node is UndefinedTypeDeclaration => {
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

const undefinedUsageMatches = (kind: UndefinedUsageKind) => {
  const matchUndefinedUsage = (node: ts.Node) => {
    const fact = NoUndefinedFact.make({ kind })
    const match = nodeMatch(node, fact)

    return Array.of(match)
  }

  return Function.constant(matchUndefinedUsage)
}

const parameterKinds = Array.of(ts.SyntaxKind.Parameter)

const parameterListeners = nodeSubscriptions(parameterKinds)(isParameterAcceptingUndefined)(
  undefinedUsageMatches("parameter")
)

const returnTypeListeners = nodeSubscriptions(returnTypeDeclarationKinds)(
  isUndefinedReturnTypeDeclaration
)(undefinedUsageMatches("return-type"))

const returnExpressionKinds = Array.make(ts.SyntaxKind.ReturnStatement, ts.SyntaxKind.ArrowFunction)

const returnExpressionListeners = nodeSubscriptions(returnExpressionKinds)(
  isUndefinedReturnedExpression
)(undefinedUsageMatches("return-expression"))

const typeDeclarationKinds = Array.make(ts.SyntaxKind.PropertySignature, ts.SyntaxKind.MappedType)

const typeDeclarationListeners = nodeSubscriptions(typeDeclarationKinds)(
  isUndefinedTypeDeclaration
)(undefinedUsageMatches("type-declaration"))

const comparisonKinds = Array.of(ts.SyntaxKind.BinaryExpression)

const comparisonListeners = nodeSubscriptions(comparisonKinds)(isUndefinedComparison)(
  undefinedUsageMatches("comparison")
)

const undefinedListenerGroups = Array.make(
  parameterListeners,
  returnTypeListeners,
  returnExpressionListeners,
  typeDeclarationListeners,
  comparisonListeners
)

const flattenedListeners = Array.flatten(undefinedListenerGroups)

const undefinedSubscriptions = Function.constant(flattenedListeners)

export const noUndefinedMatcher = makeMatcherFromSubscriptions(undefinedSubscriptions)
