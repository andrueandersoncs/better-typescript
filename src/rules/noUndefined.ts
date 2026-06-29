import { HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { combineAll, onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isReturnTypeDeclaration, unwrapExpression } from "./tsNode.js"
import type { ReturnTypeDeclaration } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-undefined"

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

const comparesAgainstUndefined = (expression: ts.BinaryExpression): boolean => {
  const isEqualityComparison = HashSet.has(
    equalityComparisonOperators,
    expression.operatorToken.kind
  )
  const hasUndefinedOperand = [expression.left, expression.right].some(
    isUndefinedExpression
  )

  return [isEqualityComparison, hasUndefinedOperand].every(Boolean)
}

const isUndefinedComparison = (node: ts.Node): node is ts.BinaryExpression =>
  ts.isBinaryExpression(node) ? comparesAgainstUndefined(node) : false

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

const declaredTypeContainsUndefined = (
  node: ReturnTypeDeclaration
): boolean => {
  const typeNode = Option.fromNullable(node.type)

  return containsUndefinedType(typeNode)
}

const isUndefinedReturnTypeDeclaration = (
  node: ts.Node
): node is ReturnTypeDeclaration =>
  isReturnTypeDeclaration(node) ? declaredTypeContainsUndefined(node) : false

const expressionFromConciseBody = (
  body: ts.ConciseBody
): Option.Option<ts.Expression> =>
  ts.isBlock(body) ? Option.none() : Option.some(body)

const returnedExpressionIsUndefined = (
  statement: ts.ReturnStatement
): boolean => {
  const expression = Option.fromNullable(statement.expression)

  return Option.exists(expression, isUndefinedExpression)
}

const returnsUndefinedFromReturnStatement = (node: ts.Node): boolean =>
  ts.isReturnStatement(node) ? returnedExpressionIsUndefined(node) : false

const arrowBodyIsUndefined = (arrowFunction: ts.ArrowFunction): boolean => {
  const expression = expressionFromConciseBody(arrowFunction.body)

  return Option.exists(expression, isUndefinedExpression)
}

const returnsUndefinedFromArrowBody = (node: ts.Node): boolean =>
  ts.isArrowFunction(node) ? arrowBodyIsUndefined(node) : false

const isUndefinedReturnExpression = (
  node: ts.Node
): node is UndefinedReturnExpression =>
  [
    returnsUndefinedFromReturnStatement(node),
    returnsUndefinedFromArrowBody(node)
  ].some(Boolean)

const isNotMinusToken = (questionToken: ts.Node): boolean =>
  questionToken.kind !== ts.SyntaxKind.MinusToken

const isOptionalMappedTypeNode = (node: ts.MappedTypeNode): boolean => {
  const questionToken = Option.fromNullable(node.questionToken)

  return Option.exists(questionToken, isNotMinusToken)
}

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
  const hasQuestionToken = isOptionalMappedTypeNode(node)
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

const undefinedMessages: Record<UndefinedUsageMatch["kind"], string> = {
  parameter: "Avoid function parameters that accept undefined.",
  "return-type": "Avoid function return types that include undefined.",
  "return-expression": "Avoid returning undefined from functions.",
  "type-declaration":
    "Avoid optional or undefined properties in type declarations.",
  comparison: "Avoid comparing values against undefined."
}

const messageForMatch = (match: UndefinedUsageMatch): string =>
  undefinedMessages[match.kind]

const undefinedMatch = (
  context: RuleContext,
  match: UndefinedUsageMatch
): RuleMatch => {
  const message = messageForMatch(match)

  return createRuleMatch(context, {
    ruleId,
    node: match.node,
    message,
    hint: optionHint
  })
}

const undefinedParameterMatches = (
  node: ts.ParameterDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  undefinedMatch(context, { kind: "parameter", node })
]

const undefinedReturnTypeMatches = (
  node: ReturnTypeDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  undefinedMatch(context, { kind: "return-type", node })
]

const undefinedReturnExpressionMatches = (
  node: UndefinedReturnExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  undefinedMatch(context, { kind: "return-expression", node })
]

const undefinedTypeDeclarationMatches = (
  node: UndefinedTypeDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  undefinedMatch(context, { kind: "type-declaration", node })
]

const undefinedComparisonMatches = (
  node: ts.BinaryExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> => [
  undefinedMatch(context, { kind: "comparison", node })
]

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

const parameterListener = onNode(
  [ts.SyntaxKind.Parameter],
  isParameterAcceptingUndefined,
  undefinedParameterMatches
)

const returnTypeListener = onNode(
  returnTypeDeclarationKinds,
  isUndefinedReturnTypeDeclaration,
  undefinedReturnTypeMatches
)

const returnExpressionListener = onNode(
  [ts.SyntaxKind.ReturnStatement, ts.SyntaxKind.ArrowFunction],
  isUndefinedReturnExpression,
  undefinedReturnExpressionMatches
)

const typeDeclarationListener = onNode(
  [ts.SyntaxKind.PropertySignature, ts.SyntaxKind.MappedType],
  isUndefinedTypeDeclaration,
  undefinedTypeDeclarationMatches
)

const comparisonListener = onNode(
  [ts.SyntaxKind.BinaryExpression],
  isUndefinedComparison,
  undefinedComparisonMatches
)

const check = combineAll([
  parameterListener,
  returnTypeListener,
  returnExpressionListener,
  typeDeclarationListener,
  comparisonListener
])

const badExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `const findUser = (id: string): User | undefined =>
  users.find((u) => u.id === id)`
})

const goodExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `const findUser = (id: string): Option.Option<User> =>
  Array.findFirst(users, (user) => user.id === id)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noUndefined = new Rule({
  id: ruleId,
  description: "Disallow undefined usage in favor of Effect Option.",
  example,
  check
})
