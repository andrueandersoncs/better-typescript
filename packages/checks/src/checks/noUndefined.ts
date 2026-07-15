import { Array, HashSet, pipe, Option } from "effect"
import * as ts from "typescript"
import {
  containsUndefinedType,
  isUndefinedReturnTypeDeclaration,
  returnTypeDeclarationKinds,
  unwrapExpression
} from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { combineAll, nodeSubscriptions, detection } from "@better-typescript/core/engine/check"
/**
 * UndefinedReturnExpression is the compiler syntax protocol handled by
 * undefined-return detection.
 *
 * @remarks
 *   It remains explicit because return statements and concise arrows share one
 *   matcher contract; removing it would repeat the union and let accepted cases
 *   drift.
 * @modelRole protocol
 */
export type UndefinedReturnExpression = ts.ReturnStatement | ts.ArrowFunction
/**
 * UndefinedTypeDeclaration is the compiler syntax protocol handled by
 * undefined-type detection.
 *
 * @remarks
 *   It remains explicit because property signatures and mapped types share one
 *   matcher contract; removing it would repeat the union and let accepted cases
 *   drift.
 * @modelRole protocol
 */
export type UndefinedTypeDeclaration = ts.PropertySignature | ts.MappedTypeNode

/**
 * UndefinedUsageKind is the usage vocabulary shared by undefined matching and
 * diagnostic messages.
 *
 * @remarks
 *   It remains explicit because both owners must classify the same cases;
 *   removing it would duplicate the literal union and let their policies
 *   drift.
 * @modelRole shared
 */
export type UndefinedUsageKind =
  "parameter" | "return-type" | "return-expression" | "type-declaration" | "comparison"

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

const equalityComparisonOperators = HashSet.make(
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

const isEqualityWithUndefined = (expr: ts.BinaryExpression): boolean => {
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

const parameterAcceptsUndefined = (param: ts.ParameterDeclaration): boolean => {
  const hasQuestionToken = pipe(param.questionToken, Option.fromNullable, Option.isSome)
  const typeNode = Option.fromNullable(param.type)
  const hasUndefinedType = containsUndefinedType(typeNode)

  return hasQuestionToken || hasUndefinedType
}

const isParameterAcceptingUndefined = (node: ts.Node): node is ts.ParameterDeclaration =>
  pipe(Option.liftPredicate(ts.isParameter)(node), Option.exists(parameterAcceptsUndefined))

const getReturnExpression = (stmt: ts.ReturnStatement): Option.Option<ts.Expression> =>
  Option.fromNullable(stmt.expression)

const getArrowExpressionBody = (fn: ts.ArrowFunction): Option.Option<ts.Expression> =>
  ts.isBlock(fn.body) ? Option.none() : Option.some(fn.body)

const isUndefinedReturnExpression = (node: ts.Node): node is UndefinedReturnExpression => {
  const returnStmt = Option.liftPredicate(ts.isReturnStatement)(node)
  const returnExprValue = Option.flatMap(returnStmt, getReturnExpression)
  const isUndefinedReturn = Option.exists(returnExprValue, isUndefinedExpression)
  const arrowFn = Option.liftPredicate(ts.isArrowFunction)(node)
  const arrowBody = Option.flatMap(arrowFn, getArrowExpressionBody)
  const isUndefinedArrow = Option.exists(arrowBody, isUndefinedExpression)
  const checks = Array.make(isUndefinedReturn, isUndefinedArrow)
  return Array.some(checks, Boolean)
}

const isNotMinusToken = (questionToken: ts.Node): boolean =>
  questionToken.kind !== ts.SyntaxKind.MinusToken

const propertySignatureAcceptsUndefined = (node: ts.PropertySignature): boolean => {
  const hasQuestionToken = pipe(node.questionToken, Option.fromNullable, Option.isSome)
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

const undefinedMessages: Record<UndefinedUsageKind, string> = {
  parameter: "Avoid function parameters that accept undefined.",
  "return-type": "Avoid function return types that include undefined.",
  "return-expression": "Avoid returning undefined from functions.",
  "type-declaration": "Avoid optional or undefined properties in type declarations.",
  comparison: "Avoid comparing values against undefined."
}

const undefinedUsageMatches = (kind: UndefinedUsageKind) => (context: CheckContext) => {
  const match = detection(context)
  const message = undefinedMessages[kind]

  const matches = (node: ts.Node): ReadonlyArray<Detection> =>
    pipe({ node, message, hint: optionHint }, match, Array.of)

  return matches
}

const parameterKinds = Array.of(ts.SyntaxKind.Parameter)

const parameterListeners = nodeSubscriptions(parameterKinds)(isParameterAcceptingUndefined)(
  undefinedUsageMatches("parameter")
)

const returnTypeListeners = nodeSubscriptions(returnTypeDeclarationKinds)(
  isUndefinedReturnTypeDeclaration
)(undefinedUsageMatches("return-type"))

const returnStatementKinds = Array.make(ts.SyntaxKind.ReturnStatement, ts.SyntaxKind.ArrowFunction)

const returnExpressionListeners = nodeSubscriptions(returnStatementKinds)(
  isUndefinedReturnExpression
)(undefinedUsageMatches("return-expression"))

const propertySignatureKinds = Array.make(ts.SyntaxKind.PropertySignature, ts.SyntaxKind.MappedType)

const typeDeclarationListeners = nodeSubscriptions(propertySignatureKinds)(
  isUndefinedTypeDeclaration
)(undefinedUsageMatches("type-declaration"))

const binaryExpressionKinds = Array.of(ts.SyntaxKind.BinaryExpression)

const comparisonListeners = nodeSubscriptions(binaryExpressionKinds)(isUndefinedComparison)(
  undefinedUsageMatches("comparison")
)

const listeners = Array.make(
  parameterListeners,
  returnTypeListeners,
  returnExpressionListeners,
  typeDeclarationListeners,
  comparisonListeners
)

const check = combineAll(listeners)

export const noUndefined: Check = check

export const noUndefinedExamples: NonEmptyRefactorExamples = fixtureRefactorExamples("no-undefined")
