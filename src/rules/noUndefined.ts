import { Option } from "effect"
import * as ts from "typescript"
import { combineAll, onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression } from "./tsNode.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-undefined"

type ReturnTypeDeclaration =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.MethodSignature
  | ts.CallSignatureDeclaration
  | ts.FunctionTypeNode
  | ts.GetAccessorDeclaration

type UndefinedReturnExpression = ts.ReturnStatement | ts.ArrowFunction
type UndefinedTypeDeclaration = ts.PropertySignature | ts.MappedTypeNode

type UndefinedUsageMatch =
  | {
      readonly kind: "parameter"
      readonly node: ts.ParameterDeclaration
    }
  | {
      readonly kind: "return-type"
      readonly node: ReturnTypeDeclaration
    }
  | {
      readonly kind: "return-expression"
      readonly node: UndefinedReturnExpression
    }
  | {
      readonly kind: "type-declaration"
      readonly node: UndefinedTypeDeclaration
    }
  | {
      readonly kind: "comparison"
      readonly node: ts.BinaryExpression
    }

const optionHint =
  "Use Effect's Option module to model optional values, and convert nullable boundaries " +
  "with Option.fromNullable."

const isUndefinedIdentifier = (identifier: ts.Identifier): boolean =>
  identifier.text === "undefined"

const isUndefinedExpression = (expression: ts.Expression): boolean =>
  Option.exists(
    Option.liftPredicate(ts.isIdentifier)(unwrapExpression(expression)),
    isUndefinedIdentifier
  )

const containsUndefinedKeyword = (node: ts.Node): boolean => {
  const isUndefinedKeyword = node.kind === ts.SyntaxKind.UndefinedKeyword
  const childContainsUndefinedKeyword =
    ts.forEachChild(node, containsUndefinedKeyword) === true

  return [isUndefinedKeyword, childContainsUndefinedKeyword].some(Boolean)
}

const containsUndefinedType = (typeNode: Option.Option<ts.TypeNode>): boolean =>
  Option.exists(typeNode, containsUndefinedKeyword)

const equalityComparisonOperators = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
])

const comparesAgainstUndefined = (expression: ts.BinaryExpression): boolean => {
  const isEqualityComparison = equalityComparisonOperators.has(expression.operatorToken.kind)
  const hasUndefinedOperand = [expression.left, expression.right].some(isUndefinedExpression)

  return [isEqualityComparison, hasUndefinedOperand].every(Boolean)
}

const isUndefinedComparison = (node: ts.Node): node is ts.BinaryExpression =>
  ts.isBinaryExpression(node) ? comparesAgainstUndefined(node) : false

const isParameterAcceptingUndefined = (
  node: ts.Node
): node is ts.ParameterDeclaration => {
  if (ts.isParameter(node)) {
    const hasQuestionToken = Option.isSome(Option.fromNullable(node.questionToken))
    const hasUndefinedType = containsUndefinedType(Option.fromNullable(node.type))

    return [hasQuestionToken, hasUndefinedType].some(Boolean)
  }

  return false
}

const isReturnTypeDeclaration = (node: ts.Node): node is ReturnTypeDeclaration =>
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

const isUndefinedReturnTypeDeclaration = (
  node: ts.Node
): node is ReturnTypeDeclaration =>
  isReturnTypeDeclaration(node)
    ? containsUndefinedType(Option.fromNullable(node.type))
    : false

const expressionFromConciseBody = (
  body: ts.ConciseBody
): Option.Option<ts.Expression> =>
  ts.isBlock(body) ? Option.none() : Option.some(body)

const returnsUndefinedFromReturnStatement = (node: ts.Node): boolean =>
  ts.isReturnStatement(node)
    ? Option.exists(Option.fromNullable(node.expression), isUndefinedExpression)
    : false

const returnsUndefinedFromArrowBody = (node: ts.Node): boolean =>
  ts.isArrowFunction(node)
    ? Option.exists(expressionFromConciseBody(node.body), isUndefinedExpression)
    : false

const isUndefinedReturnExpression = (
  node: ts.Node
): node is UndefinedReturnExpression =>
  [returnsUndefinedFromReturnStatement(node), returnsUndefinedFromArrowBody(node)].some(Boolean)

const isNotMinusToken = (questionToken: ts.Node): boolean =>
  questionToken.kind !== ts.SyntaxKind.MinusToken

const isOptionalMappedTypeNode = (node: ts.MappedTypeNode): boolean =>
  Option.exists(Option.fromNullable(node.questionToken), isNotMinusToken)

const isUndefinedTypeDeclaration = (
  node: ts.Node
): node is UndefinedTypeDeclaration => {
  if (ts.isPropertySignature(node)) {
    const hasQuestionToken = Option.isSome(Option.fromNullable(node.questionToken))
    const hasUndefinedType = containsUndefinedType(Option.fromNullable(node.type))

    return [hasQuestionToken, hasUndefinedType].some(Boolean)
  }

  if (ts.isMappedTypeNode(node)) {
    const hasQuestionToken = isOptionalMappedTypeNode(node)
    const hasUndefinedType = containsUndefinedType(Option.fromNullable(node.type))

    return [hasQuestionToken, hasUndefinedType].some(Boolean)
  }

  return false
}

const undefinedMessages: Record<UndefinedUsageMatch["kind"], string> = {
  parameter: "Avoid function parameters that accept undefined.",
  "return-type": "Avoid function return types that include undefined.",
  "return-expression": "Avoid returning undefined from functions.",
  "type-declaration": "Avoid optional or undefined properties in type declarations.",
  comparison: "Avoid comparing values against undefined."
}

const messageForMatch = (match: UndefinedUsageMatch): string => undefinedMessages[match.kind]

const undefinedMatch = (context: RuleContext, match: UndefinedUsageMatch): RuleMatch =>
  createRuleMatch(context, {
    ruleId,
    node: match.node,
    message: messageForMatch(match),
    hint: optionHint
  })

const undefinedParameterMatches = (
  node: ts.ParameterDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [undefinedMatch(context, { kind: "parameter", node })]

const undefinedReturnTypeMatches = (
  node: ReturnTypeDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [undefinedMatch(context, { kind: "return-type", node })]

const undefinedReturnExpressionMatches = (
  node: UndefinedReturnExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [undefinedMatch(context, { kind: "return-expression", node })]

const undefinedTypeDeclarationMatches = (
  node: UndefinedTypeDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [undefinedMatch(context, { kind: "type-declaration", node })]

const undefinedComparisonMatches = (
  node: ts.BinaryExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [undefinedMatch(context, { kind: "comparison", node })]

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

// One listener per undefined-usage category. Each guard already narrows to the
// node type its category reports on, so the listeners compose the same matches
// the old whole-file scan produced, in the same per-node order.
export const noUndefined: Rule = {
  id: ruleId,
  description: "Disallow undefined usage in favor of Effect Option.",
  check: combineAll([
    onNode([ts.SyntaxKind.Parameter], isParameterAcceptingUndefined, undefinedParameterMatches),
    onNode(returnTypeDeclarationKinds, isUndefinedReturnTypeDeclaration, undefinedReturnTypeMatches),
    onNode(
      [ts.SyntaxKind.ReturnStatement, ts.SyntaxKind.ArrowFunction],
      isUndefinedReturnExpression,
      undefinedReturnExpressionMatches
    ),
    onNode(
      [ts.SyntaxKind.PropertySignature, ts.SyntaxKind.MappedType],
      isUndefinedTypeDeclaration,
      undefinedTypeDeclarationMatches
    ),
    onNode([ts.SyntaxKind.BinaryExpression], isUndefinedComparison, undefinedComparisonMatches)
  ])
}
